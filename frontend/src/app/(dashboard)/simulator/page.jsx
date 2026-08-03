'use client';

import { useState, useEffect } from 'react';
import { Sliders, Cpu, DollarSign, Loader2, Play } from 'lucide-react';
import { apiRequest } from '@/services/api-client';
import { toast } from 'sonner';

export default function SimulatorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inputs
  const [category, setCategory] = useState('wardrobe');
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(2100);
  const [depth, setDepth] = useState(600);
  const [shelves, setShelves] = useState(4);
  const [drawers, setDrawers] = useState(2);
  const [shutters, setShutters] = useState(2);
  const [quantity, setQuantity] = useState(1);
  const [boardThickness, setBoardThickness] = useState(18);
  const [sheetKey, setSheetKey] = useState('8x4');
  const [kerf, setKerf] = useState(3);
  const [profitMargin, setProfitMargin] = useState(25);
  const [outputGstRate, setOutputGstRate] = useState(18);

  // Results
  const [measurementResult, setMeasurementResult] = useState(null);
  const [nestingResult, setNestingResult] = useState(null);
  const [costingResult, setCostingResult] = useState(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Run Stateless Measurement calculation
      const measureRes = await apiRequest('/measurements/calculate', {
        method: 'POST',
        body: {
          boardThickness,
          items: [
            {
              category,
              width,
              height,
              depth,
              shelves,
              drawers,
              shutters,
              quantity,
            },
          ],
        },
      });
      setMeasurementResult(measureRes);

      // Filter panels for cutting
      const panelsToCut = (measureRes.items?.[0]?.panels || [])
        .filter((p) => p.materialType === 'board' || p.materialType === 'backBoard')
        .flatMap((p) =>
          Array.from({ length: p.count }, () => ({
            w: p.w,
            d: p.d,
            label: p.name,
          }))
        );

      // 2. Run Stateless Cutting calculation
      let cutRes = null;
      if (panelsToCut.length > 0) {
        cutRes = await apiRequest('/cutting/calculate', {
          method: 'POST',
          body: {
            sheetKey,
            kerf,
            panels: panelsToCut,
          },
        });
        setNestingResult(cutRes);
      } else {
        setNestingResult(null);
      }

      // 3. Run Stateless Costing calculation
      // Construct dummy material list based on sheets and finish area
      const boardRate = 2000; // Mock rate for simulator
      const finishRate = 120; // Mock finish rate per sqft
      const hingesCount = measureRes.items?.[0]?.hardware?.hinges || 0;
      const channelsCount = measureRes.items?.[0]?.hardware?.channels || 0;

      const materialLines = [];
      if (cutRes) {
        materialLines.push({
          key: 'SIM-BOARD',
          label: `${boardThickness}mm Plywood Sheet`,
          unit: 'sheet',
          quantity: cutRes.sheetCount,
          rate: boardRate,
        });
      }
      
      const finishAreaSqm = measureRes.items?.[0]?.finishArea || 0;
      if (finishAreaSqm > 0) {
        materialLines.push({
          key: 'SIM-FINISH',
          label: 'Laminate Finish',
          unit: 'sqft',
          quantity: parseFloat((finishAreaSqm * 10.7639).toFixed(2)),
          rate: finishRate,
        });
      }

      if (hingesCount > 0) {
        materialLines.push({
          key: 'SIM-HINGE',
          label: 'Soft-Close Hinge',
          unit: 'pc',
          quantity: hingesCount,
          rate: 150,
        });
      }
      if (channelsCount > 0) {
        materialLines.push({
          key: 'SIM-CHANNEL',
          label: 'Telescopic Drawer Channel',
          unit: 'pc',
          quantity: channelsCount,
          rate: 350,
        });
      }

      const costRes = await apiRequest('/cost-estimation/calculate', {
        method: 'POST',
        body: {
          materialLines,
          profitMargin,
          outputGstRate,
        },
      });
      setCostingResult(costRes);
      toast.success('Simulation calculated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Simulation failed');
      toast.error('Simulation failed: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    runSimulation();
  }, []);

  // Visual layout rendering specs
  const getSheetDimensions = () => {
    if (sheetKey === '8x4') return { width: 2440, height: 1220 };
    if (sheetKey === '9x4') return { width: 2745, height: 1220 };
    if (sheetKey === '10x4') return { width: 3050, height: 1220 };
    return { width: 2440, height: 1220 };
  };

  const sheetSize = getSheetDimensions();
  const scaleLimit = 400; // max display width in pixels
  const scale = scaleLimit / sheetSize.width;
  const displayHeight = sheetSize.height * scale;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Sliders className="h-6 w-6 text-primary" />
          <span>Calculation Simulator</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Simulate furniture specifications statelessly to check measurement formulas, visual board nesting packing, and costing details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Input Panel (Left) */}
        <div className="lg:col-span-4 rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
            Simulation Inputs
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                <option value="wardrobe">Wardrobe</option>
                <option value="kitchen">Kitchen Counter/Cabinet</option>
                <option value="other">Other Module</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-0.5">Width (mm)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border bg-background px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-0.5">Height (mm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border bg-background px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-0.5">Depth (mm)</label>
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => setDepth(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border bg-background px-2.5 py-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-0.5">Shelves</label>
                <input
                  type="number"
                  value={shelves}
                  onChange={(e) => setShelves(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border bg-background px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-0.5">Drawers</label>
                <input
                  type="number"
                  value={drawers}
                  onChange={(e) => setDrawers(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border bg-background px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-0.5">Shutters</label>
                <input
                  type="number"
                  value={shutters}
                  onChange={(e) => setShutters(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded border bg-background px-2.5 py-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Thickness (mm)</label>
                <select
                  value={boardThickness}
                  onChange={(e) => setBoardThickness(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-xs"
                >
                  <option value={18}>18 mm</option>
                  <option value={12}>12 mm</option>
                  <option value={6}>6 mm</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Qty Units</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-md border bg-background px-3 py-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Sheet Size</label>
                <select
                  value={sheetKey}
                  onChange={(e) => setSheetKey(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-xs"
                >
                  <option value="8x4">8x4 (2440×1220)</option>
                  <option value="9x4">9x4 (2745×1220)</option>
                  <option value="10x4">10x4 (3050×1220)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Kerf (mm)</label>
                <input
                  type="number"
                  value={kerf}
                  onChange={(e) => setKerf(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-md border bg-background px-3 py-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Margin (%)</label>
                <input
                  type="number"
                  value={profitMargin}
                  onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">GST (%)</label>
                <input
                  type="number"
                  value={outputGstRate}
                  onChange={(e) => setOutputGstRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-105 active:scale-95 transition-all"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              <span>Calculate Simulation</span>
            </button>
          </div>
        </div>

        {/* Results Panel (Right) */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
              Failed to run simulation: {error}
            </div>
          )}

          {/* Visual Nesting layout Map */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-500" />
              <span>Nesting Optimization Map</span>
            </h3>

            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !nestingResult || nestingResult.layout?.length === 0 ? (
              <div className="h-48 border border-dashed rounded-lg flex flex-col items-center justify-center text-center p-6 bg-muted/10">
                <p className="text-sm text-muted-foreground">Empty nesting layout</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Change dimensions to add panels and nest them onto sheets.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Nesting Stats Banner */}
                <div className="grid grid-cols-3 gap-2 border rounded-lg p-3 bg-muted/20 text-xs">
                  <div>
                    <span className="text-muted-foreground">Sheets Consumed:</span>{' '}
                    <span className="font-semibold text-foreground">{nestingResult.sheetCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Used Area:</span>{' '}
                    <span className="font-semibold text-foreground">
                      {nestingResult.usedArea?.toFixed(2)} sqm
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scrap Waste:</span>{' '}
                    <span className="font-semibold text-foreground">
                      {nestingResult.wastePct?.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Sheets display grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {nestingResult.layout.map((s, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="text-xs font-semibold text-muted-foreground">Sheet #{idx + 1}</div>
                      <div
                        style={{ width: scaleLimit, height: displayHeight }}
                        className="relative border-2 border-foreground/60 rounded bg-muted/40 shadow-inner overflow-hidden"
                      >
                        {s.panels.map((p, pIdx) => {
                          const wPx = p.w * scale;
                          const hPx = p.d * scale;
                          const lPx = p.x * scale;
                          const tPx = p.y * scale;

                          // Random color mapping for visual aesthetics
                          const hues = [196, 260, 340, 45, 140];
                          const h = hues[(pIdx + idx) % hues.length];

                          return (
                            <div
                              key={pIdx}
                              style={{
                                width: wPx - 1,
                                height: hPx - 1,
                                left: lPx,
                                top: tPx,
                                backgroundColor: `hsla(${h}, 70%, 45%, 0.15)`,
                                borderColor: `hsla(${h}, 70%, 45%, 0.6)`,
                              }}
                              className="absolute border flex flex-col items-center justify-center p-0.5 text-[8px] font-bold tracking-tight text-foreground/80 overflow-hidden leading-none select-none hover:brightness-105"
                              title={`${p.label}: ${p.w} x ${p.d} mm ${p.rotated ? '(Rotated)' : ''}`}
                            >
                              <div className="truncate max-w-full">{p.label}</div>
                              <div className="text-[7px] text-muted-foreground mt-0.5">
                                {p.w}×{p.d}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Cost breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Measurement breakdown */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-foreground pb-2 border-b">
                Measurements Breakdown
              </h3>
              {loading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !measurementResult ? (
                <p className="text-xs text-muted-foreground">No data calculated</p>
              ) : (
                <div className="text-xs space-y-2 max-h-64 overflow-y-auto pr-1">
                  {measurementResult.items?.[0]?.panels.map((p, idx) => (
                    <div key={idx} className="flex justify-between border-b pb-1">
                      <div>
                        <span className="font-semibold">{p.name}</span>{' '}
                        <span className="text-[10px] text-muted-foreground font-mono">({p.material})</span>
                      </div>
                      <div className="font-mono text-muted-foreground">
                        {p.w} × {p.d} × {p.t} mm
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cost estimation breakdown */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 border-b pb-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span>Cost &amp; Pricing Breakdown</span>
              </h3>

              {loading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !costingResult ? (
                <p className="text-xs text-muted-foreground">No data calculated</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {/* Category Costings */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Raw Materials:</span>
                      <span className="font-semibold text-foreground">
                        ₹{(costingResult.totals?.materialPaise / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Manufacturing/CNC:</span>
                      <span className="font-semibold text-foreground">
                        ₹{(costingResult.totals?.manufacturingPaise / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Carpenter Labour:</span>
                      <span className="font-semibold text-foreground">
                        ₹{(costingResult.totals?.labourPaise / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pricing block */}
                  <div className="border-t pt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>Subtotal (Base Cost):</span>
                      <span>₹{(costingResult.totals?.costPaise / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Profit Margin ({profitMargin}%):</span>
                      <span>₹{(costingResult.pricing?.profitPaise / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground border-t pt-1.5">
                      <span>Taxable Subtotal:</span>
                      <span>₹{(costingResult.pricing?.taxablePaise / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Output GST ({outputGstRate}%):</span>
                      <span>₹{(costingResult.pricing?.gstPaise / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Final selling price */}
                  <div className="border-t-2 border-double pt-2 text-base font-bold text-primary flex justify-between">
                    <span>Selling Price:</span>
                    <span>₹{(costingResult.pricing?.totalPaise / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
