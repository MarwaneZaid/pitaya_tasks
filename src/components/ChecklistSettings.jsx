import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, X, ClipboardList } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import {
  OPS_POSTS,
  CHECKLIST_RECURRENCE_DAILY,
  CHECKLIST_RECURRENCE_WEEKDAYS,
  DEFAULT_CHECKLIST_TEMPLATES,
} from '../config/opsConstants';
import { JOURS } from '../config/planning';
import {
  getChecklistTemplates,
  saveChecklistTemplate,
  deleteChecklistTemplate,
} from '../lib/db';

function cloneDefaultTemplates(startIndex = 0) {
  return DEFAULT_CHECKLIST_TEMPLATES.map((t, i) => ({
    ...t,
    id: `new-${Date.now()}-${startIndex + i}`,
    active: true,
    items: (t.items || []).map((it) => ({ ...it })),
  }));
}

export default function ChecklistSettings({ isOpen, onClose, onSaved }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getChecklistTemplates();
      if (list.length === 0) {
        const defaults = cloneDefaultTemplates();
        setTemplates(defaults);
        setActiveId(defaults[0]?.id || null);
      } else {
        setTemplates(list);
        setActiveId(list[0]?.id || null);
      }
    } catch (e) {
      console.error(e);
      const defaults = cloneDefaultTemplates();
      setTemplates(defaults);
      setActiveId(defaults[0]?.id || null);
    }
    setLoading(false);
  };

  const active = templates.find((t) => t.id === activeId) || templates[0];

  const updateActive = (patch) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === active?.id ? { ...t, ...patch } : t))
    );
  };

  const updateItem = (index, field, value) => {
    if (!active) return;
    const items = [...(active.items || [])];
    items[index] = { ...items[index], [field]: value };
    updateActive({ items });
  };

  const addItem = () => {
    updateActive({
      items: [...(active?.items || []), { title: '', priority: 'moyenne' }],
    });
  };

  const removeItem = (index) => {
    updateActive({ items: (active.items || []).filter((_, i) => i !== index) });
  };

  const addTemplate = () => {
    const id = `new-${Date.now()}`;
    const t = {
      id,
      name: 'Nouvelle checklist',
      post: 'all',
      recurrence: CHECKLIST_RECURRENCE_DAILY,
      weekdayKeys: null,
      items: [],
      sortOrder: templates.length,
      active: true,
    };
    setTemplates((prev) => [...prev, t]);
    setActiveId(id);
  };

  /** Ajoute les modèles Pitaya manquants (par nom), sans écraser l’existant. */
  const importPitayaTemplates = () => {
    const existingNames = new Set(
      templates.map((t) => String(t.name || '').trim().toLowerCase())
    );
    const toAdd = cloneDefaultTemplates(templates.length).filter(
      (t) => !existingNames.has(String(t.name).trim().toLowerCase())
    );
    if (toAdd.length === 0) {
      showToast({
        message: 'Les modèles Pitaya sont déjà présents.',
        variant: 'info',
      });
      return;
    }
    setTemplates((prev) => [
      ...prev,
      ...toAdd.map((t, i) => ({ ...t, sortOrder: prev.length + i })),
    ]);
    setActiveId(toAdd[0].id);
    showToast({
      message: `${toAdd.length} modèle(s) Pitaya ajouté(s). Enregistrez pour les sauver.`,
      variant: 'success',
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      for (const t of templates) {
        const payload = {
          ...t,
          id: String(t.id).startsWith('new-') ? undefined : t.id,
          items: (t.items || []).filter((it) => (it.title || '').trim()),
        };
        if (!payload.name?.trim()) continue;
        await saveChecklistTemplate(payload);
      }
      showToast({ message: 'Checklists enregistrées.', variant: 'success' });
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      showToast({ message: 'Erreur lors de l’enregistrement.', variant: 'error' });
    }
    setSaving(false);
  };

  const handleDeleteTemplate = async () => {
    if (!active || !confirm(`Supprimer « ${active.name} » ?`)) return;
    if (!String(active.id).startsWith('new-')) {
      try {
        await deleteChecklistTemplate(active.id);
      } catch (e) {
        console.error(e);
        showToast({ message: 'Suppression impossible.', variant: 'error' });
        return;
      }
    }
    const next = templates.filter((t) => t.id !== active.id);
    setTemplates(next);
    setActiveId(next[0]?.id || null);
    showToast({ message: 'Checklist supprimée.', variant: 'info' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Modèles de checklist</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-slate-500">Chargement…</p>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    t.id === activeId
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {t.name}
                </button>
              ))}
              <button
                type="button"
                onClick={addTemplate}
                className="px-3 py-1.5 text-sm rounded-lg border border-dashed border-slate-300 text-slate-600"
              >
                + Modèle
              </button>
              <button
                type="button"
                onClick={importPitayaTemplates}
                className="px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-medium hover:bg-amber-100"
                title="Importer les checklists manager / cuisine / salle Pitaya"
              >
                Importer modèles Pitaya
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Modèles Pitaya : Manager (ouverture / après-rush / fermeture), Cuisine, Caisse &amp; Salle.
              Cliquez « Importer », puis « Enregistrer », puis « Générer les checklists » sur le tableau.
            </p>

            {active && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={active.name}
                      onChange={(e) => updateActive({ name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                    <select
                      value={active.post}
                      onChange={(e) => updateActive({ post: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    >
                      {OPS_POSTS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Récurrence</label>
                    <select
                      value={active.recurrence}
                      onChange={(e) => updateActive({ recurrence: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                    >
                      <option value={CHECKLIST_RECURRENCE_DAILY}>Tous les jours</option>
                      <option value={CHECKLIST_RECURRENCE_WEEKDAYS}>Jours choisis</option>
                    </select>
                  </div>
                </div>

                {active.recurrence === CHECKLIST_RECURRENCE_WEEKDAYS && (
                  <div className="flex flex-wrap gap-2">
                    {JOURS.map((jour) => (
                      <label key={jour} className="flex items-center gap-1 text-sm capitalize">
                        <input
                          type="checkbox"
                          checked={(active.weekdayKeys || []).includes(jour)}
                          onChange={(e) => {
                            const keys = new Set(active.weekdayKeys || []);
                            if (e.target.checked) keys.add(jour);
                            else keys.delete(jour);
                            updateActive({ weekdayKeys: [...keys] });
                          }}
                        />
                        {jour}
                      </label>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Étapes</p>
                  {(active.items || []).map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Contrôle températures"
                        value={item.title}
                        onChange={(e) => updateItem(index, 'title', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                      />
                      <select
                        value={item.priority || 'moyenne'}
                        onChange={(e) => updateItem(index, 'priority', e.target.value)}
                        className="px-2 py-2 border border-slate-300 rounded-xl text-sm"
                      >
                        <option value="haute">Haute</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="basse">Basse</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-sm text-indigo-600 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une étape
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  className="text-sm text-red-600 hover:underline"
                >
                  Supprimer ce modèle
                </button>
              </>
            )}
          </div>
        )}

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
