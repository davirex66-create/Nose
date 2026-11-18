/* ECOCRACIA · Guardado en LocalStorage (autoguardado + 3 ranuras manuales) */
(function (E) {
  'use strict';
  const PREFIX = 'ecocracia.v1.slot.';
  const SLOTS = ['auto', '1', '2', '3'];

  function storage() {
    try {
      const k = '__eco_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return window.localStorage;
    } catch (e) { return null; }
  }

  function valid(state) {
    return state && state.version === 1 && Array.isArray(state.tiles) && state.tiles.length > 0 &&
      state.ind && typeof state.money === 'number' && typeof state.year === 'number' && Array.isArray(state.history);
  }

  E.save = {
    SLOTS,
    available() { return !!storage(); },
    slotName(slot) { return slot === 'auto' ? 'Autoguardado' : 'Ranura ' + slot; },
    write(slot, state) {
      const ls = storage();
      if (!ls) return { ok: false, msg: 'El navegador no permite guardar datos (LocalStorage desactivado).' };
      const data = {
        meta: { slot, savedAt: Date.now(), year: state.year, status: state.status, region: state.regionName, capital: state.capitalName, pop: state.pop, money: state.money, difficulty: state.difficulty },
        state
      };
      try {
        ls.setItem(PREFIX + slot, JSON.stringify(data));
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: 'No se pudo guardar la partida: ' + e.message };
      }
    },
    read(slot) {
      const ls = storage();
      if (!ls) return null;
      try {
        const raw = ls.getItem(PREFIX + slot);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !valid(data.state)) return null;
        return data;
      } catch (e) { return null; }
    },
    remove(slot) {
      const ls = storage();
      if (ls) ls.removeItem(PREFIX + slot);
    },
    list() {
      return SLOTS.map((slot) => { const d = this.read(slot); return { slot, meta: d ? d.meta : null }; });
    },
    latest() {
      let best = null;
      this.list().forEach((x) => { if (x.meta && (!best || x.meta.savedAt > best.meta.savedAt)) best = x; });
      return best;
    }
  };
})(window.ECO);
