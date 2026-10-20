// Librerías desde CDN (sin instalar nada). Versiones fijas.
export {
  html, render, createContext,
  useState, useReducer, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useContext,
} from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/preact/standalone.module.js';
export { default as Sortable } from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/modular/sortable.esm.js';
export const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
export const XLSX_ESM = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
