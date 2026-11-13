// Ranking controller shared by the category and combined screens: the weight slider, the sort control (chips on the
// phone, column headers on the desktop) and the ranked rows. Totals are recomputed in the browser from scores + lists
// + slider (scoring/total.js) and the rows are re-sorted high -> low (nulls last) without being rebuilt.
import { isWide, rafThrottle } from "../dom.js";
import { app } from "../state.js";
import { rankStocks } from "../scoring/total.js";
import { slider } from "./slider.js";
import { sortChips } from "./sortChips.js";
import { rankCard } from "./rankList.js";
import { rankTable } from "./rankTable.js";
import { openStockSheet } from "./stockSheet.js";

/**
 * @param {{stocks: object[], notes?: Object<string,string>, ctx?: object, limit?: number}} o  ctx goes to the sheet.
 * @returns {{slider: HTMLElement, sort: HTMLElement|null, list: HTMLElement, destroy(): void}}
 */
export function ranking({ stocks, notes = {}, ctx = {}, limit = 0, label }) {
  const wide = isWide();
  const open = (row, opener) => openStockSheet(row.stock, { ...ctx, note: notes[row.stock.symbol], opener });
  const setSort = (k) => {
    app.sortKey = k;
    chips?.set(k);
    render();
  };
  const view = wide ? rankTable({ onOpen: open, onSort: setSort, limit, label }) : rankCard({ onOpen: open, label });
  // desktop: if the table card is narrower than 560 px its sub-score columns are hidden, and these chips (testid
  // sortchip-*) stand in for those headers there; otherwise CSS hides the chips (container query on .cat-main)
  const chips = wide ? sortChips({ value: app.sortKey, onChange: setSort, testPrefix: "sortchip", cls: "sortbar--desk" }) : sortChips({ value: app.sortKey, onChange: setSort });
  const render = () => view.update(rankStocks(stocks, app.sortKey, app.slider), app.sortKey);
  const rerender = rafThrottle(render);
  const sl = slider({
    value: app.slider,
    onInput: (v) => {
      app.slider = v;
      rerender();
    },
  });
  render();
  const off = app.bus.on("settings", () => {
    sl.set(app.slider);
    render();
  });
  return { slider: sl.el, sort: chips ? chips.el : null, list: view.el, destroy: off };
}
