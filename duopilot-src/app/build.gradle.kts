import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// גרסה: version.properties בשורש הפרויקט. בכל גרסה חדשה מעלים versionCode ב-1 (חובה, אחרת העדכון האוטומטי לא יראה אותה).
val versionProps = Properties().apply {
    rootProject.file("version.properties").inputStream().use { load(it) }
}

android {
    namespace = "com.yaniv.duopilot"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.yaniv.duopilot"
        minSdk = 30          // Android 11: צילום מסך לעוזר, IME_ENTER, WindowMetrics
        targetSdk = 35
        versionCode = versionProps.getProperty("versionCode").trim().toInt()
        versionName = versionProps.getProperty("versionName").trim()
        // מאיפה בודקים עדכונים (אתר GitHub Pages של יניב)
        buildConfigField("String", "UPDATE_BASE", "\"https://yanivedelstein44-creator.github.io/duopilot/\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            // ה-APK יוצא לא חתום מ-GitHub Actions ונחתם אחר כך במפתח הקבוע (ראה CLAUDE.md)
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

tasks.withType<KotlinCompile>().configureEach {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    // בלי ספריות צד שלישי: רק Android + Kotlin.
}
