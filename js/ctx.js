import { createContext, useContext } from './deps.js';

// Estado global de la app (sesión, datos, idioma, acciones)
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
