import { useState } from 'react';
import { ContainerType, VehicleClass } from '../types';
import { CONTAINERS, CONTAINER_SIZES, ContainerSize, VEHICLE_CLASS_META } from '../data/containers';
import { Thermometer, Wind, Maximize2, Grid3x3, Truck, PlaneTakeoff, Package, Layers } from 'lucide-react';

interface Props {
  selected: ContainerType;
  onSelect: (c: ContainerType) => void;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; shadow: string }> = {
  Dry: { label: 'Dry', icon: <Wind size={13} strokeWidth={2.5} />, shadow: 'shadow-brut-green' },
  Reefer: { label: 'Reefer', icon: <Thermometer size={13} strokeWidth={2.5} />, shadow: 'shadow-brut-red' },
  'Open Top': { label: 'Open Top', icon: <Maximize2 size={13} strokeWidth={2.5} />, shadow: 'shadow-brut-orange' },
  'Flat Rack': { label: 'Flat Rack', icon: <Grid3x3 size={13} strokeWidth={2.5} />, shadow: 'shadow-brut' },
  Van: { label: 'Dry Van', icon: <Truck size={13} strokeWidth={2.5} />, shadow: 'shadow-brut-green' },
  Curtainsider: { label: 'Curtainsider', icon: <Truck size={13} strokeWidth={2.5} />, shadow: 'shadow-brut' },
  Flatbed: { label: 'Flatbed', icon: <Layers size={13} strokeWidth={2.5} />, shadow: 'shadow-brut-orange' },
  'Box Truck': { label: 'Box Truck', icon: <Package size={13} strokeWidth={2.5} />, shadow: 'shadow-brut' },
  LCL: { label: 'LCL Space', icon: <Package size={13} strokeWidth={2.5} />, shadow: 'shadow-brut-green' },
  'Air Container': { label: 'Air Container', icon: <PlaneTakeoff size={13} strokeWidth={2.5} />, shadow: 'shadow-brut' },
  'Air Pallet': { label: 'Air Pallet', icon: <PlaneTakeoff size={13} strokeWidth={2.5} />, shadow: 'shadow-brut-orange' },
};

const CLASS_ICONS: Record<VehicleClass, React.ReactNode> = {
  container: <Grid3x3 size={14} strokeWidth={2.5} />,
  truck: <Truck size={14} strokeWidth={2.5} />,
  air: <PlaneTakeoff size={14} strokeWidth={2.5} />,
  lcl: <Package size={14} strokeWidth={2.5} />,
};

function VehicleCard({ container, isSelected, onClick }: { container: ContainerType; isSelected: boolean; onClick: () => void }) {
  const meta = CATEGORY_META[container.category];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-3 border-2 border-brut-black text-left transition-all ${
        isSelected
          ? `bg-brut-black text-white ${meta?.shadow ?? 'shadow-brut'}`
          : 'bg-white text-brut-black hover:bg-brut-bg shadow-brut-sm hover:shadow-brut'
      }`}
    >
      <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-brut-black'}`}>
        {meta?.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black uppercase tracking-tight leading-none">{container.shortName}</div>
        <div className={`font-mono text-[10px] mt-1 ${isSelected ? 'text-white/60' : 'text-brut-black/45'}`}>
          {container.volume} m³ · {container.maxPayload.toLocaleString()} kg
        </div>
      </div>
      {isSelected && <div className="w-2 h-2 bg-brut-red shrink-0" />}
    </button>
  );
}

function ContainerSpecs({ container }: { container: ContainerType }) {
  return (
    <div className="border-2 border-brut-black bg-brut-paper p-4">
      <div className="text-xs font-black uppercase tracking-tight text-brut-black mb-3">{container.name}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <span className="brut-section-label">Inner L × W × H</span>
        <span className="font-mono text-xs font-bold text-brut-black">{container.innerLength} × {container.innerWidth} × {container.innerHeight} cm</span>
        <span className="brut-section-label">Volume</span>
        <span className="font-mono text-xs font-bold">{container.volume} m³</span>
        <span className="brut-section-label">Max payload</span>
        <span className="font-mono text-xs font-bold">{container.maxPayload.toLocaleString()} kg</span>
        {container.teu > 0 && (
          <>
            <span className="brut-section-label">TEU</span>
            <span className="font-mono text-xs font-bold">{container.teu}</span>
          </>
        )}
        {container.axleConfig && (
          <>
            <span className="brut-section-label">Front axle max</span>
            <span className="font-mono text-xs font-bold">{container.axleConfig.maxFrontAxleKg.toLocaleString()} kg</span>
            <span className="brut-section-label">Rear axle max</span>
            <span className="font-mono text-xs font-bold">{container.axleConfig.maxRearAxleKg.toLocaleString()} kg</span>
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
      <div className="grid grid-cols-2 gap-1.5">
        {vcClasses.map(vc => {
          const isActive = vehicleClass === vc;
          return (
            <button
              key={vc}
              onClick={() => handleClassChange(vc)}
              className={`flex items-center gap-2 px-3 py-2.5 border-2 border-brut-black text-left transition-all ${
                isActive
                  ? 'bg-brut-black text-white'
                  : 'bg-white text-brut-black hover:bg-brut-bg shadow-brut-sm'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-brut-black/60'}>
                {CLASS_ICONS[vc]}
              </span>
              <span className="text-xs font-black uppercase tracking-tight leading-none">
                {VEHICLE_CLASS_META[vc].label}
              </span>
            </button>
          );
        })}
      </div>

      {vehicleClass === 'container' ? (
        <>
          <div>
            <p className="brut-section-label mb-2.5">Size</p>
            <div className="grid grid-cols-3 gap-2">
              {CONTAINER_SIZES.map(size => {
                const hasContainers = CONTAINERS.some(c => c.sizeLabel === size && c.vehicleClass === 'container');
                if (!hasContainers) return null;
                const isActive = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className={`py-2.5 px-2 border-2 border-brut-black text-center text-sm font-black uppercase tracking-tight transition-all ${
                      isActive
                        ? 'bg-brut-black text-white shadow-brut-red'
                        : 'bg-white text-brut-black hover:bg-brut-bg shadow-brut-sm hover:shadow-brut'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="brut-section-label mb-2.5">Type</p>
            <div className="space-y-2">
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
        <div className="space-y-2">
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
