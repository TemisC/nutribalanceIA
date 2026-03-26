
import React, { useState } from 'react';
import { analyzeFoodImage } from '../services/geminiService';
import api from '../services/api';
import { FoodAnalysis, LoggedMeal } from '../types';

interface FoodVisionProps {
  userId: string;
  onEarnTokens: (amount: number) => void;
  onSpendTokens: (amount: number, description: string) => boolean;
  onSaveMeal: (meal: LoggedMeal) => void;
  onShare: (content: string, type: 'achievement' | 'motivation', image?: string) => Promise<void>;
}

const FoodVision: React.FC<FoodVisionProps> = ({ userId, onEarnTokens, onSpendTokens, onSaveMeal, onShare }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'scanner' | 'diary'>('scanner');
  const [searchTerm, setSearchTerm] = useState('');

  // Load History
  React.useEffect(() => {
    // Placeholder for history loading
  }, []);

  const handleShare = async () => {
    console.log("[FoodVision] Share button clicked");
    if (!result) {
      console.warn("[FoodVision] Share aborted: No result");
      return;
    }
    if (!image) {
      console.warn("[FoodVision] Share aborted: No image");
      return;
    }

    setSharing(true);
    try {
      console.log("[FoodVision] Calling onShare...");
      const shareText = `🍽️ Mi análisis de comida: ${result.foodName}\n📊 ${result.calories} kcal | P: ${result.protein}g | C: ${result.carbs}g | G: ${result.fats}g\n💡 ${result.analysisText || '¡Nutrición inteligente!'}`;
      await onShare(shareText, 'motivation', image);
      console.log("[FoodVision] onShare completed successfully");
    } catch (e) {
      console.error("[FoodVision] Share error", e);
      alert(`Error al compartir: ${e instanceof Error ? e.message : 'Desconocido'}`);
    } finally {
      setSharing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a FileReader
      const reader = new FileReader();

      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          // Resize Logic using Canvas
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension limit (e.g. 1024px)
          const MAX_SIZE = 1024;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          setImage(compressedBase64);
          setResult(null);
        };

        if (readerEvent.target?.result) {
          img.src = readerEvent.target.result as string;
        }
      };

      reader.readAsDataURL(file);
    }
  };


  // Load History
  React.useEffect(() => {
    if (userId) {
      console.log("[FoodVision] Fetching history for userId:", userId);

      // Use the configured API service instead of raw fetch to avoid double '/api/api' issues
      // and ensure consistent base URL handling
      api.get(`/users/${userId}/meals`)
        .then(response => {
          console.log("[FoodVision] Response status:", response.status);
          const data = response.data;
          console.log("[FoodVision] Data received:", data);
          if (data.meals) {
            console.log("[FoodVision] Setting history count:", data.meals.length);
            setHistory(data.meals);
          } else {
            console.warn("[FoodVision] No 'meals' array in response");
          }
        })
        .catch(err => console.error("[FoodVision] Fetch error:", err));
    } else {
      console.warn("[FoodVision] No userId provided to component");
    }
  }, [userId]);

  const handleAnalyze = async () => {
    if (!image) return;

    // Check Balance (Optimistic)
    const success = onSpendTokens(20, 'Análisis Manual (Visión)');
    if (!success) return;

    setAnalyzing(true);
    try {
      const base64Data = image.split(',')[1];
      const jsonRes = await analyzeFoodImage(base64Data);
      const parsed: FoodAnalysis = JSON.parse(jsonRes);
      setResult(parsed);

      // NOTE: We do NOT auto-save to diary anymore. User must click "Save".

    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error al analizar imagen");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToDiary = async () => {
    if (!result || !userId) return;

    const mealToSave: LoggedMeal = {
      id: Date.now().toString(),
      foodName: result.foodName,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fats: result.fats,
      timestamp: new Date().toISOString(),
      image: image || undefined,
      analysisText: result.analysisText,
      suggestions: result.suggestions
    };

    // 1. Call Parent onSaveMeal (Updates Progress & Calorie Counter)
    onSaveMeal(mealToSave);

    // 2. Persist to DB (via API) & Update Local History
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${userId}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mealToSave)
      });

      // Add to history list (Optimistic)
      // Transform LoggedMeal to DB shape if needed, but for now they match loosely
      setHistory([mealToSave, ...history]);
      alert("¡Comida guardada en tu diario!");
      setActiveTab('diary'); // Auto-switch to diary to show saved item

    } catch (e) {
      console.error("Error saving meal to DB", e);
    }
  };

  const handleDelete = async (mealId: string) => {
    if (!confirm("¿Estás seguro de borrar esta comida?")) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${userId}/meals/${mealId}`, {
        method: 'DELETE'
      });
      setHistory(history.filter(h => h.id !== mealId));
    } catch (e) {
      console.error("Error deleting meal", e);
    }
  };



  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <header className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Escáner de Comidas</h2>
        <p className="text-slate-500 mt-2">Sube una foto de tu plato para obtener un desglose nutricional instantáneo.</p>
      </header>

      {/* TABS NAVIGATION */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-8 max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'scanner'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <i className="fas fa-camera mr-2"></i> Escanear
        </button>
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === 'diary'
            ? 'bg-white text-emerald-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <i className="fas fa-book mr-2"></i> Mi Diario
        </button>
      </div>

      {activeTab === 'scanner' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fadeIn">
          {/* Upload Section */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center">
            {image ? (
              <div className="relative w-full group">
                <img src={image} className="w-full h-64 object-cover rounded-2xl shadow-inner border border-slate-200" alt="Preview" />
                <button
                  onClick={() => { setImage(null); setResult(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <label className="w-full h-64 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <i className="fas fa-cloud-upload-alt text-slate-400 text-2xl group-hover:text-emerald-500"></i>
                </div>
                <p className="text-sm font-semibold text-slate-600">Haz clic para subir o arrastra una imagen</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG (máx. 5MB)</p>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!image || analyzing || !!result}
              className={`w-full mt-6 py-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${!image || analyzing || !!result
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                }`}
            >
              {analyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Analizando Plato...
                </>
              ) : result ? (
                <>
                  <i className="fas fa-check"></i>
                  Análisis Completado
                </>
              ) : (
                <>
                  <i className="fas fa-magic"></i>
                  Analizar Macronutrientes (20 Tokens)
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result ? (
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-slideInRight">
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="text-emerald-500"><i className="fas fa-check-circle"></i></span>
                  {result.foodName}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-orange-50 p-4 rounded-2xl">
                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">Calorías</p>
                    <p className="text-2xl font-black text-orange-700">{result.calories} kcal</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Proteína</p>
                    <p className="text-2xl font-black text-emerald-700">{result.protein}g</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Carbos</p>
                    <p className="text-2xl font-black text-blue-700">{result.carbs}g</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl">
                    <p className="text-xs text-purple-600 font-bold uppercase mb-1">Grasas</p>
                    <p className="text-2xl font-black text-purple-700">{result.fats}g</p>
                  </div>
                </div>

                {result.analysisText && (
                  <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                    <p className="text-slate-700 text-sm leading-relaxed italic">
                      <i className="fas fa-quote-left text-slate-300 mr-2"></i>
                      {result.analysisText}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <i className="fas fa-lightbulb text-amber-500"></i> Consejos del Nutricionista
                  </h4>
                  <ul className="space-y-2">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-emerald-500 mt-1"><i className="fas fa-caret-right"></i></span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions Section */}
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
                  <button
                    onClick={handleSaveToDiary}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <i className="fas fa-save"></i> Agregar a mi Diario
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                  >
                    {sharing ? (
                      <><i className="fas fa-spinner fa-spin"></i> Compartiendo...</>
                    ) : (
                      <><i className="fas fa-share-alt"></i> Compartir con la Comunidad</>
                    )}
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                  <i className="fas fa-brain text-slate-200 text-3xl"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-400">Esperando análisis...</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-[240px]">La IA identificará los ingredientes y valores nutricionales automáticamente.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DIARY TAB */
        <div className="animate-fadeIn">
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-2xl font-bold text-slate-800">📚 Tu Diario de Comidas</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar comida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <i className="fas fa-utensils text-4xl text-slate-300 mb-4"></i>
              <p className="text-slate-500 font-medium">Aún no has guardado comidas.</p>
              <button onClick={() => setActiveTab('scanner')} className="mt-4 text-emerald-600 font-bold hover:underline">
                ¡Escanea tu primera comida!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {history
                .filter(item => (item.food_name || item.foodName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => setSelectedMeal(item)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 group relative cursor-pointer hover:shadow-md transition"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition z-10"
                    >
                      <i className="fas fa-trash"></i>
                    </button>

                    {item.image_base64 || item.image ? (
                      <img src={item.image_base64 || item.image} alt={item.food_name || item.foodName} className="w-full h-40 object-cover rounded-xl mb-4 bg-slate-100" />
                    ) : (
                      <div className="w-full h-40 bg-slate-50 rounded-xl mb-4 flex items-center justify-center text-slate-300">
                        <i className="fas fa-utensils text-2xl"></i>
                      </div>
                    )}

                    <h4 className="font-bold text-slate-800 text-sm truncate">{item.food_name || item.foodName}</h4>
                    <p className="text-xs text-slate-500 mb-2">
                      {new Date(item.created_at || item.timestamp).toLocaleDateString()}
                    </p>
                    <div className="flex justify-between items-center text-xs font-bold bg-slate-50 p-2 rounded-lg text-slate-600">
                      <span>🔥 {item.calories} kcal</span>
                      <span>💪 {item.protein} P</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* MEAL DETAIL MODAL */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedMeal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scaleIn" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMeal(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-2xl font-bold text-slate-800 mb-2 pr-12">{selectedMeal.food_name || selectedMeal.foodName}</h3>
            <p className="text-sm text-slate-500 mb-6 flex items-center gap-2">
              <i className="far fa-calendar-alt"></i>
              {new Date(selectedMeal.created_at || selectedMeal.timestamp).toLocaleString()}
            </p>

            <div className="rounded-2xl overflow-hidden mb-8 border border-slate-100 shadow-inner bg-slate-50">
              {selectedMeal.image_base64 || selectedMeal.image ? (
                <img src={selectedMeal.image_base64 || selectedMeal.image} className="w-full object-contain max-h-[300px]" alt="Meal" />
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400">Sin Imagen</div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-orange-50 p-3 rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold text-orange-400 mb-1">Calorías</p>
                <p className="text-xl font-black text-orange-600">{selectedMeal.calories}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Proteína</p>
                <p className="text-xl font-black text-emerald-600">{selectedMeal.protein}g</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Carbos</p>
                <p className="text-xl font-black text-blue-600">{selectedMeal.carbs}g</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold text-purple-400 mb-1">Grasas</p>
                <p className="text-xl font-black text-purple-600">{selectedMeal.fats}g</p>
              </div>
            </div>

            {/* AI Analysis Details */}
            {selectedMeal.analysis_text && (
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-700 mb-2 text-sm"><i className="fas fa-brain text-emerald-500 mr-2"></i>Análisis de IA</h4>
                <p className="text-sm text-slate-600 italic">{selectedMeal.analysis_text}</p>
              </div>
            )}

            {(selectedMeal.suggestions_json || selectedMeal.suggestions) && (
              <div className="mb-4">
                <h4 className="font-bold text-slate-700 mb-2 text-sm"><i className="fas fa-lightbulb text-amber-500 mr-2"></i>Sugerencias</h4>
                <ul className="space-y-2">
                  {(typeof selectedMeal.suggestions_json === 'string'
                    ? JSON.parse(selectedMeal.suggestions_json)
                    : (selectedMeal.suggestions_json || selectedMeal.suggestions || [])
                  ).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5"><i className="fas fa-caret-right"></i></span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div >
  );
};

export default FoodVision;
