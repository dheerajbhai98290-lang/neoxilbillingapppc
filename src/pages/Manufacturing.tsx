import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client.js';
import { formatINR } from '../utils/indianCurrency.js';
import {
  Factory,
  Plus,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Trash2,
  Package
} from 'lucide-react';

export const Manufacturing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BATCHES' | 'RECIPES'>('BATCHES');
  const [batches, setBatches] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [isNewRecipeOpen, setIsNewRecipeOpen] = useState(false);

  // New Batch Form State
  const [batchProductId, setBatchProductId] = useState('');
  const [batchBomId, setBatchBomId] = useState('');
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [plannedQty, setPlannedQty] = useState('100');
  const [acceptedQty, setAcceptedQty] = useState('100');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [wastedQty, setWastedQty] = useState('0');
  const [unit, setUnit] = useState('Bottle');
  const [labourCost, setLabourCost] = useState('500');
  const [overheadCost, setOverheadCost] = useState('300');
  const [batchNotes, setBatchNotes] = useState('');
  const [materialsConsumed, setMaterialsConsumed] = useState<any[]>([
    { raw_material_id: '', quantity: 1, unit: 'Kg', cost_per_unit: 0 }
  ]);

  // New Recipe Form State
  const [recipeProductId, setRecipeProductId] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeOutputQty, setRecipeOutputQty] = useState('100');
  const [recipeOutputUnit, setRecipeOutputUnit] = useState('Bottle');
  const [recipeLabourEst, setRecipeLabourEst] = useState('500');
  const [recipeOverheadEst, setRecipeOverheadEst] = useState('300');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [recipeItems, setRecipeItems] = useState<any[]>([
    { raw_material_id: '', quantity: 1, unit: 'Kg', cost_per_unit: 0 }
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batRes, recRes, prodRes, matRes] = await Promise.all([
        apiRequest('/production'),
        apiRequest('/recipes'),
        apiRequest('/products'),
        apiRequest('/raw-materials')
      ]);
      setBatches(batRes);
      setRecipes(recRes);
      setProducts(prodRes);
      setRawMaterials(matRes);
    } catch (err) {
      console.error('Failed to load manufacturing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When recipe is chosen for production batch, auto-fill consumed ingredients scaled by planned qty
  const handleSelectRecipeForBatch = (bomId: string) => {
    setBatchBomId(bomId);
    const rec = recipes.find(r => r.id === bomId);
    if (!rec) return;

    setBatchProductId(rec.product_id);
    setUnit(rec.output_unit);
    setLabourCost(String(rec.labour_cost_est || 0));
    setOverheadCost(String(rec.overhead_cost_est || 0));

    const factor = Number(plannedQty) / Number(rec.expected_output_qty || 1);
    const scaledItems = rec.items.map((it: any) => ({
      raw_material_id: it.raw_material_id,
      quantity: Math.round(Number(it.quantity) * factor * 100) / 100,
      unit: it.unit,
      cost_per_unit: it.latest_cost || it.cost_per_unit || 0
    }));

    setMaterialsConsumed(scaledItems);
  };

  const handleAddConsumedItem = () => {
    setMaterialsConsumed([
      ...materialsConsumed,
      { raw_material_id: '', quantity: 1, unit: 'Kg', cost_per_unit: 0 }
    ]);
  };

  const handleRemoveConsumedItem = (index: number) => {
    if (materialsConsumed.length <= 1) return;
    setMaterialsConsumed(materialsConsumed.filter((_, i) => i !== index));
  };

  const handleConsumedItemChange = (index: number, field: string, value: any) => {
    const updated = [...materialsConsumed];
    const item = { ...updated[index], [field]: value };
    if (field === 'raw_material_id') {
      const mat = rawMaterials.find(m => m.id === value);
      if (mat) {
        item.unit = mat.unit;
        item.cost_per_unit = mat.purchase_cost || 0;
      }
    }
    updated[index] = item;
    setMaterialsConsumed(updated);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!batchProductId) {
      setFormError('Please select a finished product.');
      return;
    }

    const invalid = materialsConsumed.filter(m => !m.raw_material_id || Number(m.quantity) <= 0);
    if (invalid.length > 0) {
      setFormError('All consumed materials must have an item selected and quantity > 0.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/production', {
        method: 'POST',
        body: JSON.stringify({
          product_id: batchProductId,
          bom_id: batchBomId || null,
          production_date: productionDate,
          mfg_date: mfgDate,
          expiry_date: expiryDate,
          planned_quantity: Number(plannedQty),
          accepted_quantity: Number(acceptedQty),
          rejected_quantity: Number(rejectedQty),
          wasted_quantity: Number(wastedQty),
          unit,
          labour_cost: Number(labourCost),
          electricity_overhead_cost: Number(overheadCost),
          materials_consumed: materialsConsumed,
          notes: batchNotes
        })
      });

      await fetchData();
      setIsNewBatchOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Production batch creation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReverseBatch = async (batchId: string, batchNo: string) => {
    if (!confirm(`Are you sure you want to reverse batch ${batchNo}? This will restore consumed chemicals & packaging stock, deduct finished product stock, and record an audit reversal.`)) return;

    try {
      await apiRequest(`/production/${batchId}/reverse`, { method: 'POST' });
      await fetchData();
      alert(`Batch ${batchNo} reversed successfully.`);
    } catch (err: any) {
      alert(err.message || 'Batch reversal failed');
    }
  };

  // Recipe item changes
  const handleAddRecipeItem = () => {
    setRecipeItems([
      ...recipeItems,
      { raw_material_id: '', quantity: 1, unit: 'Kg', cost_per_unit: 0 }
    ]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    if (recipeItems.length <= 1) return;
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleRecipeItemChange = (index: number, field: string, value: any) => {
    const updated = [...recipeItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'raw_material_id') {
      const mat = rawMaterials.find(m => m.id === value);
      if (mat) {
        item.unit = mat.unit;
        item.cost_per_unit = mat.purchase_cost || 0;
      }
    }
    updated[index] = item;
    setRecipeItems(updated);
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!recipeProductId || !recipeName.trim()) {
      setFormError('Product and recipe name are required.');
      return;
    }

    const invalid = recipeItems.filter(m => !m.raw_material_id || Number(m.quantity) <= 0);
    if (invalid.length > 0) {
      setFormError('All ingredients must have a material selected and quantity > 0.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          product_id: recipeProductId,
          recipe_name: recipeName.trim(),
          expected_output_qty: Number(recipeOutputQty),
          output_unit: recipeOutputUnit,
          labour_cost_est: Number(recipeLabourEst),
          overhead_cost_est: Number(recipeOverheadEst),
          instructions: recipeInstructions,
          items: recipeItems
        })
      });

      await fetchData();
      setIsNewRecipeOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 font-sans">
            Manufacturing &amp; Production Batches
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Formulation recipes (BOM), batch execution, atomic inventory consumption, unit costing, and batch reversal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'BATCHES' ? (
            <button
              onClick={() => {
                setIsNewBatchOpen(true);
                setFormError(null);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
            >
              <Factory className="h-4 w-4" />
              <span>Execute Production Batch</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsNewRecipeOpen(true);
                setFormError(null);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create New BOM Recipe</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('BATCHES')}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'BATCHES'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Factory className="h-4 w-4" />
          <span>Production Batches ({batches.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition ${
            activeTab === 'RECIPES'
              ? 'border-blue-700 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Formulations &amp; Recipes ({recipes.length})</span>
        </button>
      </div>

      {/* TAB 1: BATCHES */}
      {activeTab === 'BATCHES' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Manufactured Product</th>
                  <th className="py-3 px-4 text-right">Output Qty</th>
                  <th className="py-3 px-4 text-right">Wastage / Scrap</th>
                  <th className="py-3 px-4 text-right">Raw Material Cost</th>
                  <th className="py-3 px-4 text-right">Total Batch Cost</th>
                  <th className="py-3 px-4 text-right">Unit Cost (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {batches.length > 0 ? (
                  batches.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{b.batch_number}</td>
                      <td className="py-3 px-4 text-slate-600">{b.production_date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {b.product_name}
                        {b.expiry_date && (
                          <span className="block text-[10px] text-slate-500 font-normal">
                            Exp: {b.expiry_date}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        {b.accepted_quantity} {b.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-red-600">
                        {b.wasted_quantity > 0 ? `${b.wasted_quantity} ${b.unit}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{formatINR(b.raw_material_cost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatINR(b.total_cost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">{formatINR(b.cost_per_unit)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleReverseBatch(b.id, b.batch_number)}
                            title="Reverse batch (Restores materials, reduces finished stock)"
                            className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 hover:border-red-300"
                          >
                            <RotateCcw className="inline h-3 w-3 mr-1" />
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                      No production batches executed yet. Click "Execute Production Batch" to manufacture cleaning goods.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RECIPES / BOM */}
      {activeTab === 'RECIPES' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map(r => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                    BOM v{r.version}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Batch Yield: {r.expected_yield_pct}%
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900">{r.recipe_name}</h3>
                <p className="text-xs font-semibold text-blue-700">Output: {r.expected_output_qty} {r.output_unit} of {r.product_name}</p>

                {/* Ingredients list */}
                <div className="mt-4 border-t border-slate-100 pt-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Required Raw Materials &amp; Packs:</span>
                  {r.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-xs text-slate-700">
                      <span>{it.material_name}</span>
                      <span className="font-mono font-semibold">{it.quantity} {it.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Overhead: {formatINR((r.labour_cost_est || 0) + (r.overhead_cost_est || 0))}</span>
                <button
                  onClick={() => {
                    handleSelectRecipeForBatch(r.id);
                    setIsNewBatchOpen(true);
                  }}
                  className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Produce Batch &rarr;
                </button>
              </div>
            </div>
          ))}
          {recipes.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">
              No formulation recipes created yet. Click "Create New BOM Recipe" to define manufacturing recipes.
            </div>
          )}
        </div>
      )}

      {/* EXECUTE BATCH MODAL */}
      {isNewBatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative flex flex-col max-h-[96vh] w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-base font-black text-slate-900 font-sans">Execute Production Batch</h2>
                <p className="text-xs text-slate-500">Consumes raw chemicals/packs and adds finished goods stock with unique batch tracking.</p>
              </div>
              <button onClick={() => setIsNewBatchOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateBatch} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                  {formError}
                </div>
              )}

              {/* Master Batch Inputs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Load from Recipe (Optional)</label>
                  <select
                    value={batchBomId}
                    onChange={e => handleSelectRecipeForBatch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold"
                  >
                    <option value="">-- Manual Formulation --</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>{r.recipe_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product to Produce *</label>
                  <select
                    required
                    value={batchProductId}
                    onChange={e => setBatchProductId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.size || p.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accepted Output Qty *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={acceptedQty}
                    onChange={e => setAcceptedQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturing Date</label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={e => setMfgDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date (FEFO)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Labour Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={labourCost}
                    onChange={e => setLabourCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Electricity / Overhead (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={overheadCost}
                    onChange={e => setOverheadCost(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Raw Materials Consumed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Chemicals, Ingredients &amp; Packaging Consumed
                  </span>
                  <button
                    type="button"
                    onClick={handleAddConsumedItem}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Material</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Raw Material / Packaging *</th>
                        <th className="py-2.5 px-2 w-24">Qty Consumed *</th>
                        <th className="py-2.5 px-2 w-20">Unit</th>
                        <th className="py-2.5 px-2 w-24">Cost / Unit (₹)</th>
                        <th className="py-2.5 px-3 text-right w-28">Total Cost (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {materialsConsumed.map((m, idx) => {
                        const lineCost = Number(m.quantity || 0) * Number(m.cost_per_unit || 0);

                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3 text-slate-500 font-bold">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <select
                                required
                                value={m.raw_material_id}
                                onChange={e => handleConsumedItemChange(idx, 'raw_material_id', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-2 text-xs font-bold text-slate-900 bg-white"
                              >
                                <option value="">-- Select Material / Bottle / Cap --</option>
                                {rawMaterials.map(rm => (
                                  <option key={rm.id} value={rm.id}>
                                    {rm.name} ({rm.category}) - Avail: {rm.current_stock} {rm.unit}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                required
                                value={m.quantity}
                                onChange={e => handleConsumedItemChange(idx, 'quantity', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs text-right font-bold"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={m.unit}
                                onChange={e => handleConsumedItemChange(idx, 'unit', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1 text-xs text-center"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={m.cost_per_unit}
                                onChange={e => handleConsumedItemChange(idx, 'cost_per_unit', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs text-right font-mono"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatINR(lineCost)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {materialsConsumed.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveConsumedItem(idx)}
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewBatchOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? 'Processing Batch...' : 'Finalize Batch & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RECIPE MODAL */}
      {isNewRecipeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative flex flex-col max-h-[96vh] w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-base font-black text-slate-900 font-sans">Create Formulation / Recipe (BOM)</h2>
              <button onClick={() => setIsNewRecipeOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateRecipe} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Finished Product *</label>
                  <select
                    required
                    value={recipeProductId}
                    onChange={e => setRecipeProductId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold bg-white"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.size || p.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipe Name *</label>
                  <input
                    type="text"
                    required
                    value={recipeName}
                    onChange={e => setRecipeName(e.target.value)}
                    placeholder="e.g. Standard 1000L Floor Cleaner Formulation"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standard Batch Output Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={recipeOutputQty}
                    onChange={e => setRecipeOutputQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Output Unit</label>
                  <input
                    type="text"
                    value={recipeOutputUnit}
                    onChange={e => setRecipeOutputUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Recipe Ingredients */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 uppercase">Standard Ingredients Per Batch</span>
                  <button
                    type="button"
                    onClick={handleAddRecipeItem}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    + Add Ingredient
                  </button>
                </div>

                {recipeItems.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={it.raw_material_id}
                      onChange={e => handleRecipeItemChange(idx, 'raw_material_id', e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 py-1.5 px-3 text-xs bg-white font-semibold"
                    >
                      <option value="">-- Choose Raw Material / Bottle / Cap --</option>
                      {rawMaterials.map(rm => (
                        <option key={rm.id} value={rm.id}>{rm.name} ({rm.category})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={it.quantity}
                      onChange={e => handleRecipeItemChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-20 rounded-xl border border-slate-300 py-1.5 px-2 text-xs font-bold text-right"
                    />

                    <input
                      type="text"
                      value={it.unit}
                      onChange={e => handleRecipeItemChange(idx, 'unit', e.target.value)}
                      className="w-16 rounded-xl border border-slate-300 py-1.5 px-1 text-xs text-center"
                    />

                    {recipeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeItem(idx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewRecipeOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
