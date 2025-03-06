import * as wasm from "./minesweeper_bg.wasm";
export * from "./minesweeper_bg.js";
import { __wbg_set_wasm } from "./minesweeper_bg.js";
__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
