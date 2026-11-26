package com.chessofages.islandrealms;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.agesignals.*;
import com.google.android.play.agesignals.model.*;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * בדיקת גיל לפי חוק (Texas SB 2420 וחוקים דומים) דרך Play Age Signals API (ספרייה 0.0.6) — רק בגרסת Google Play.
 * נכנס לעטיפה ב-build-aab.sh, ונרשם ב-MainActivity (registerPlugin). צד ה-JavaScript: src/core/AgeGate.js.
 *
 * check() מחזיר תמיד resolve (אף פעם לא reject), עם:
 *   ok         — false אם הייתה תקלה (אז המשחק לא חוסם; בודקים שוב בפתיחה הבאה)
 *   mandatory  — Google Play מסמנת שהחוק חל על המשתמש (ApplicableAgeFeature.MANDATORY_SHARING).
 *                false = כל השאר (ישראל, אירופה וכו'): לא שואלים כלום ולא מוצג שום חלון.
 *   status     — רק כש-mandatory: SHARED / NOT_SHARED / VERIFICATION_REQUIRED
 *   ageLower, ageUpper — רק כש-SHARED: טווח הגיל (למשל 13–15; ageUpper חסר = הטווח העליון, 18+)
 *   change     — APPROVED / PENDING / DECLINED: אישור הורה ל"שינוי משמעותי" (רק לחשבון בפיקוח הורים)
 *
 * לא מחזירים installId ולא מקור האימות: המשחק לא צריך אותם (תנאי השירות: שימוש רק לחוויה מותאמת גיל לפי חוק).
 * כל הקריאות עטופות ב-try: חריגה בתוך listener על ה-UI thread הייתה מקריסה את האפליקציה.
 */
@CapacitorPlugin(name = "AgeSignals")
public class AgeSignalsPlugin extends Plugin {

    private AgeSignalsManager manager;

    private AgeSignalsManager manager() {
        if (manager == null) manager = AgeSignalsManagerFactory.create(getContext().getApplicationContext());
        return manager;
    }

    @PluginMethod
    public void check(PluginCall call) {
        final JSObject out = new JSObject();
        final AtomicBoolean done = new AtomicBoolean(false);
        out.put("ok", true);
        out.put("mandatory", false);
        final Activity activity = getActivity();
        if (activity == null) { fail(call, out, done, "activity", null); return; }
        activity.runOnUiThread(() -> {
            try {
                manager().getApplicableAgeFeatures(ApplicableAgeFeaturesRequest.builder().build())
                    .addOnSuccessListener(res -> {
                        try {
                            final boolean mandatory = res != null && res.features() != null
                                && res.features().contains(ApplicableAgeFeature.MANDATORY_SHARING);
                            out.put("mandatory", mandatory);
                            if (!mandatory) { finish(call, out, done); return; }
                            requestAccess(activity, call, out, done);
                        } catch (Throwable t) { fail(call, out, done, "features", t); }
                    })
                    .addOnFailureListener(e -> fail(call, out, done, "features", e));
            } catch (Throwable t) { fail(call, out, done, "features", t); }
        });
    }

    /** באזור שבו השיתוף חובה Google Play לא מציגה חלון בתוך האפליקציה — רק מחזירה את המצב */
    private void requestAccess(Activity activity, PluginCall call, JSObject out, AtomicBoolean done) {
        try {
            manager().requestAgeSignalsAccess(AgeSignalsAccessRequest.builder().setActivity(activity).build())
                .addOnSuccessListener(acc -> {
                    try {
                        final String status = statusName(acc == null ? null : acc.ageSignalsStatus());
                        out.put("status", status);
                        if (!"SHARED".equals(status)) { finish(call, out, done); return; }
                        readSignals(call, out, done);
                    } catch (Throwable t) { fail(call, out, done, "access", t); }
                })
                .addOnFailureListener(e -> fail(call, out, done, "access", e));
        } catch (Throwable t) { fail(call, out, done, "access", t); }
    }

    private void readSignals(PluginCall call, JSObject out, AtomicBoolean done) {
        try {
            manager().checkAgeSignals(AgeSignalsRequest.builder().build())
                .addOnSuccessListener(r -> {
                    try {
                        if (r != null) {
                            final Object lower = r.ageLower();
                            final Object upper = r.ageUpper();
                            final Object change = r.significantChangeStatus();
                            if (lower != null) out.put("ageLower", lower);
                            if (upper != null) out.put("ageUpper", upper);
                            if (change != null) out.put("change", changeName(change));
                        }
                        finish(call, out, done);
                    } catch (Throwable t) { fail(call, out, done, "signals", t); }
                })
                .addOnFailureListener(e -> fail(call, out, done, "signals", e));
        } catch (Throwable t) { fail(call, out, done, "signals", t); }
    }

    private static String statusName(Object s) {
        if (s == null) return "NONE";
        if (Objects.equals(s, AgeSignalsStatus.SHARED)) return "SHARED";
        if (Objects.equals(s, AgeSignalsStatus.NOT_SHARED)) return "NOT_SHARED";
        if (Objects.equals(s, AgeSignalsStatus.VERIFICATION_REQUIRED)) return "VERIFICATION_REQUIRED";
        return "OTHER_" + s;
    }

    private static String changeName(Object c) {
        if (Objects.equals(c, SignificantChangeStatus.APPROVED)) return "APPROVED";
        if (Objects.equals(c, SignificantChangeStatus.PENDING)) return "PENDING";
        if (Objects.equals(c, SignificantChangeStatus.DECLINED)) return "DECLINED";
        return "OTHER_" + c;
    }

    private void finish(PluginCall call, JSObject out, AtomicBoolean done) {
        if (done.compareAndSet(false, true)) call.resolve(out);
    }

    private void fail(PluginCall call, JSObject out, AtomicBoolean done, String stage, Throwable e) {
        out.put("ok", false);
        out.put("stage", stage);
        if (e != null) out.put("error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        finish(call, out, done);
    }
}
