import { useState } from 'react';
import { ContainerType, VehicleClass } from '../types';
import { CONTAINERS, CONTAINER_SIZES, ContainerSize, VEHICLE_CLASS_META } from '../data/containers';
import { Thermometer, Wind, Maximize2, Grid3x3, Truck, PlaneTakeoff, Package, Layers } from 'lucide-react';

interface Props {
  selected: ContainerType;
  onSelect: (c: ContainerType) => void;
}

const CATEGORY_ACCENT: Record<string, string> = {
  Dry: '#3DB240',
  Reefer: '#38BDF8',
  'Open Top': '#F59E0B',
  'Flat Rack': '#94A3B8',
  Van: '#3DB240',
  Curtainsider: '#94A3B8',
  Flatbed: '#F59E0B',
  'Box Truck': '#94A3B8',
  LCL: '#3DB240',
  'Air Container': '#94A3B8',
  'Air Pallet': '#F59E0B',
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Dry: <Wind size={13} strokeWidth={2} />,
  Reefer: <Thermometer size={13} strokeWidth={2} />,
  'Open Top': <Maximize2 size={13} strokeWidth={2} />,
  'Flat Rack': <Grid3x3 size={13} strokeWidth={2} />,
  Van: <Truck size={13} strokeWidth={2} />,
  Curtainsider: <Truck size={13} strokeWidth={2} />,
  Flatbed: <Layers size={13} strokeWidth={2} />,
  'Box Truck': <Package size={13} strokeWidth={2} />,
  LCL: <Package size={13} strokeWidth={2} />,
  'Air Container': <PlaneTakeoff size={13} strokeWidth={2} />,
  'Air Pallet': <PlaneTakeoff size={13} strokeWidth={2} />,
};

const CLASS_ICONS: Record<VehicleClass, React.ReactNode> = {
  container: <Grid3x3 size={13} strokeWidth={2} />,
  truck: <Truck size={13} strokeWidth={2} />,
  air: <PlaneTakeoff size={13} strokeWidth={2} />,
  lcl: <Package size={13} strokeWidth={2} />,
};

function VehicleCard({ container, isSelected, onClick }: { container: ContainerType; isSelected: boolean; onClick: () => void }) {
  const accent = CATEGORY_ACCENT[container.category] ?? '#3DB240';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all"
      style={isSelected
        ? { background: `${accent}1A`, border: `1px solid ${accent}45`, boxShadow: `inset 3px 0 0 ${accent}` }
        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
      }
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
    >
      <span style={{ color: isSelected ? accent : 'rgba(255,255,255,0.40)' }}>
        {CATEGORY_ICON[container.category]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white leading-none">{container.shortName}</div>
        <div className="text-[10px] mt-1 text-white/35 font-mono">
          {container.volume} m³ · {container.maxPayload.toLocaleString()} kg
        </div>
      </div>
      {isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />}
    </button>
  );
}

function ContainerSpecs({ container }: { container: ContainerType }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="text-xs font-semibold text-white/70 mb-3 leading-none">{container.name}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <span className="brut-section-label">L × W × H</span>
        <span className="font-mono text-xs text-white/60">{container.innerLength} × {container.innerWidth} × {container.innerHeight} cm</span>
        <span className="brut-section-label">Volume</span>
        <span className="font-mono text-xs text-white/60">{container.volume} m³</span>
        <span className="brut-section-label">Max payload</span>
        <span className="font-mono text-xs text-white/60">{container.maxPayload.toLocaleString()} kg</span>
        {container.teu > 0 && (
          <>
            <span className="brut-section-label">TEU</span>
            <span className="font-mono text-xs text-white/60">{container.teu}</span>
          </>
        )}
        {container.axleConfig && (
          <>
            <span className="brut-section-label">Front axle max</span>
            <span className="font-mono text-xs text-white/60">{container.axleConfig.maxFrontAxleKg.toLocaleString()} kg</span>
            <span className="brut-section-label">Rear axle max</span>
            <span className="font-mono text-xs text-white/60">{container.axleConfig.maxRearAxleKg.toLocaleString()} kg</span>
          </>
        )}
      </div>
    </div>
  );
}

export function ContainerSelector({ selected, onSelect }: Props) {
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>(selected.vehicleClass ?? 'container');
  const [selectedSize, setSelectedSize] = useState<ContainerSize>(
    (selected.sizeLabel as ContainerSize) ?? '20ft',
  );

  const handleClassChange = (vc: VehicleClass) => {
    setVehicleClass(vc);
    const first = CONTAINERS.find(c => c.vehicleClass === vc);
    if (first) {
      onSelect(first);
      if (vc === 'container') setSelectedSize(first.sizeLabel as ContainerSize);
    }
  };

  const handleSizeChange = (size: ContainerSize) => {
    setSelectedSize(size);
    const first = CONTAINERS.find(c => c.sizeLabel === size && c.vehicleClass === 'container');
    if (first) onSelect(first);
  };

  const vcClasses: VehicleClass[] = ['container', 'truck', 'air', 'lcl'];

  return (
    <div className="space-y-4">
      {/* Vehicle class selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {vcClasses.map(vc => {
          const isActive = vehicleClass === vc;
          return (
            <button
              key={vc}
              onClick={() => handleClassChange(vc)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all"
              style={isActive
                ? { background: 'rgba(61,178,64,0.18)', border: '1px solid rgba(61,178,64,0.32)', color: '#5DC258' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.50)' }
              }
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; }}
            >
              <span>{CLASS_ICONS[vc]}</span>
              <span className="text-xs font-semibold leading-none">{VEHICLE_CLASS_META[vc].label}</span>
            </button>
          );
        })}
      </div>

      {vehicleClass === 'container' ? (
        <>
          <div>
            <p className="brut-section-label mb-2.5">Size</p>
            <div className="grid grid-cols-3 gap-1.5">
              {CONTAINER_SIZES.map(size => {
                const hasContainers = CONTAINERS.some(c => c.sizeLabel === size && c.vehicleClass === 'container');
                if (!hasContainers) return null;
                const isActive = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className="py-2 px-2 rounded-lg text-center text-xs font-semibold transition-all"
                    style={isActive
                      ? { background: 'rgba(61,178,64,0.18)', border: '1px solid rgba(61,178,64,0.32)', color: '#5DC258' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.50)' }
                    }
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="brut-section-label mb-2.5">Type</p>
            <div className="space-y-1.5">
              {CONTAINERS.filter(c => c.sizeLabel === selectedSize && c.vehicleClass === 'container').map(container => (
                <VehicleCard
                  key={container.id}
                  container={container}
                  isSelected={selected.id === container.id}
                  onClick={() => onSelect(container)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          {CONTAINERS.filter(c => c.vehicleClass === vehicleClass).map(container => (
            <VehicleCard
              key={container.id}
              container={container}
              isSelected={selected.id === container.id}
              onClick={() => onSelect(container)}
            />
          ))}
        </div>
      )}

      <ContainerSpecs container={selected} />
    </div>
  );
}
