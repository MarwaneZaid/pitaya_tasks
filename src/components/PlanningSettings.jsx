import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { JOURS } from '../config/planning';
import { TASK_TYPE_QUOTIDIEN, TASK_TYPE_SEMAINE, TASK_TYPE_ANNEXE } from '../config/constants';
import { getPlanningConfig, savePlanningConfig } from '../lib/db';

const DEFAULT_PLANNING = {
  siteName: 'Mon Restaurant',
  planning: {
    lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: []
  },
  annexes: []
};

export default function PlanningSettings({ isOpen, onClose, onSave }) {
  const [config, setConfig] = useState(DEFAULT_PLANNING);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const result = await getPlanningConfig();
      if (result) {
        setConfig(result);
      } else {
        setConfig(DEFAULT_PLANNING);
      }
    } catch {
      setConfig(DEFAULT_PLANNING);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      await savePlanningConfig(config);
      onSave(config);
      onClose();
    } catch (e) {
      alert('Erreur lors de la sauvegarde de la configuration.');
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'Général' },
    ...JOURS.map(j => ({ id: j, label: j.charAt(0).toUpperCase() + j.slice(1) })),
    { id: 'annexes', label: 'Annexes (Hebdo)' }
  ];

  const handleAddTask = (listName) => {
    const defaultTask = { title: '', priority: 'moyenne' };
    
    if (listName === 'annexes') {
      setConfig(prev => ({ ...prev, annexes: [...(prev.annexes || []), defaultTask] }));
    } else {
      setConfig(prev => ({
        ...prev,
        planning: { ...prev.planning, [listName]: [...(prev.planning[listName] || []), defaultTask] }
      }));
    }
  };

  const updateTask = (listName, index, field, value) => {
    if (listName === 'annexes') {
      const newAnnexes = [...config.annexes];
      newAnnexes[index][field] = value;
      setConfig({ ...config, annexes: newAnnexes });
    } else {
      const newList = [...config.planning[listName]];
      newList[index][field] = value;
      setConfig({
        ...config,
        planning: { ...config.planning, [listName]: newList }
      });
    }
  };

  const removeTask = (listName, index) => {
    if (listName === 'annexes') {
      const newAnnexes = config.annexes.filter((_, i) => i !== index);
      setConfig({ ...config, annexes: newAnnexes });
    } else {
      const newList = config.planning[listName].filter((_, i) => i !== index);
      setConfig({
        ...config,
        planning: { ...config.planning, [listName]: newList }
      });
    }
  };

  const renderTaskList = (listName) => {
    const list = listName === 'annexes' ? (config.annexes || []) : (config.planning[listName] || []);
    return (
      <div className="space-y-3 mt-4">
        {list.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Aucune tâche définie pour cette section.</p>
        ) : (
          list.map((t, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={t.title}
                onChange={(e) => updateTask(listName, index, 'title', e.target.value)}
                placeholder="Description de la tâche..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <select
                value={t.priority}
                onChange={(e) => updateTask(listName, index, 'priority', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
              <button onClick={() => removeTask(listName, index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
        <button
          onClick={() => handleAddTask(listName)}
          className="mt-3 flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Ajouter une tâche
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Configuration du Restaurant</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Chargement de la configuration...</div>
        ) : (
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-slate-200 overflow-x-auto md:overflow-y-auto p-2 flex flex-row md:flex-col gap-1 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-sm text-left rounded-lg whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content pane */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === 'general' ? (
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-800">Informations Générales</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom du Restaurant / Site</label>
                    <input
                      type="text"
                      value={config.siteName}
                      onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Ex: Pitaya Lyon"
                    />
                  </div>
                  <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm leading-relaxed border border-amber-200">
                    <p><strong>Remarque :</strong> Configurez ici les tâches qui s'ajouteront automatiquement lorsque vos équipes cliqueront sur "Ajouter les tâches du jour".</p>
                  </div>
                </div>
              ) : activeTab === 'annexes' ? (
                <div>
                  <h3 className="font-medium text-slate-800">Tâches Hebdomadaires (Annexes)</h3>
                  <p className="text-sm text-slate-500 mt-1">Ces tâches sont destinées à être réparties sur la semaine.</p>
                  {renderTaskList('annexes')}
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-slate-800">Tâches du {activeTab}</h3>
                  <p className="text-sm text-slate-500 mt-1">Indispensables à accomplir ce jour-là.</p>
                  {renderTaskList(activeTab)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg">Annuler</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium">
            <Save className="w-4 h-4" /> Enregistrer la configuration
          </button>
        </div>
      </div>
    </div>
  );
}
