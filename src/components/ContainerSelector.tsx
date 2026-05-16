import { useState } from 'react';
import { ContainerType, VehicleClass } from '../types';
import { CONTAINERS, CONTAINER_SIZES, ContainerSize, VEHICLE_CLASS_META } from '../data/containers';
import { Thermometer, Wind, Maximize2, Grid3x3, Truck, PlaneTakeoff, Package, Layers } from 'lucide-react';

interface Props {
  selected: ContainerType;
  onSelect: (c: ContainerType) => void;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Dry:            <Wind size={13} strokeWidth={2} />,
  Reefer:         <Thermometer size={13} strokeWidth={2} />,
  'Open Top':     <Maximize2 size={13} strokeWidth={2} />,
  'Flat Rack':    <Grid3x3 size={13} strokeWidth={2} />,
  Van:            <Truck size={13} strokeWidth={2} />,
  Curtainsider:   <Truck size={13} strokeWidth={2} />,
  Flatbed:        <Layers size={13} strokeWidth={2} />,
  'Box Truck':    <Package size={13} strokeWidth={2} />,
  LCL:            <Package size={13} strokeWidth={2} />,
  'Air Container':<PlaneTakeoff size={13} strokeWidth={2} />,
  'Air Pallet':   <PlaneTakeoff size={13} strokeWidth={2} />,
};

const CLASS_ICONS: Record<VehicleClass, React.ReactNode> = {
  container: <Grid3x3 size={13} strokeWidth={2} />,
  truck:     <Truck size={13} strokeWidth={2} />,
  air:       <PlaneTakeoff size={13} strokeWidth={2} />,
  lcl:       <Package size={13} strokeWidth={2} />,
};

const pillWrap = {
  background: 'rgba(0,0,0,0.05)',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 100,
  padding: 3,
} as const;

const pillActive = {
  background: 'linear-gradient(135deg, #16a34a, #15803d)',
  borderRadius: 100,
  color: '#fff',
  boxShadow: '0 2px 8px rgba(22,163,74,0.32)',
} as const;

const pillIdle = {
  background: 'transparent',
  borderRadius: 100,
  color: 'rgba(20,83,45,0.5)',
} as const;

function VehicleCard({ container, isSelected, onClick }: {
  container: ContainerType; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
      style={isSelected ? {
        background: 'linear-gradient(135deg, #16a34a, #15803d)',
        borderRadius: 12,
        color: '#fff',
        boxShadow: '0 3px 14px rgba(22,163,74,0.32)',
      } : {
        background: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(22,163,74,0.14)',
        borderRadius: 12,
        color: '#14532d',
      }}
    >
      <span style={{ opacity: isSelected ? 0.9 : 0.5 }}>
        {CATEGORY_ICON[container.category]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-none">{container.shortName}</div>
        <div className="font-mono text-[10px] mt-0.5" style={{ opacity: isSelected ? 0.7 : 0.45 }}>
          {container.volume} m³ · {container.maxPayload.toLocaleString()} kg
        </div>
      </div>
      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-white/80" />
      )}
    </button>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.42)' }}>{label}</span>
      <span className="font-mono text-xs font-semibold" style={{ color: '#14532d' }}>{value}</span>
    </>
  );
}

function ContainerSpecs({ container }: { container: ContainerType }) {
  return (
    <div className="rounded-xl p-3 space-y-0" style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.12)' }}>
      <div className="text-xs font-semibold mb-2.5" style={{ color: '#14532d' }}>{container.name}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <SpecRow label="L × W × H" value={`${container.innerLength} × ${container.innerWidth} × ${container.innerHeight} cm`} />
        <SpecRow label="Volume" value={`${container.volume} m³`} />
        <SpecRow label="Max payload" value={`${container.maxPayload.toLocaleString()} kg`} />
        {container.teu > 0 && <SpecRow label="TEU" value={`${container.teu}`} />}
        {container.axleConfig && (
          <>
            <SpecRow label="Front axle" value={`${container.axleConfig.maxFrontAxleKg.toLocaleString()} kg`} />
            <SpecRow label="Rear axle" value={`${container.axleConfig.maxRearAxleKg.toLocaleString()} kg`} />
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
    <div className="space-y-3">
      {/* Vehicle class tabs */}
      <div className="grid grid-cols-2 gap-1" style={pillWrap}>
        {vcClasses.map(vc => {
          const isActive = vehicleClass === vc;
          return (
            <button
              key={vc}
              onClick={() => handleClassChange(vc)}
              className="flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all"
              style={isActive ? pillActive : pillIdle}
            >
              {CLASS_ICONS[vc]}
              <span>{VEHICLE_CLASS_META[vc].label}</span>
            </button>
          );
        })}
      </div>

      {vehicleClass === 'container' ? (
        <>
          {/* Size selector */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(20,83,45,0.42)' }}>Size</p>
            <div className="flex gap-1" style={pillWrap}>
              {CONTAINER_SIZES.map(size => {
                const hasContainers = CONTAINERS.some(c => c.sizeLabel === size && c.vehicleClass === 'container');
                if (!hasContainers) return null;
                const isActive = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeChange(size)}
                    className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
                    style={isActive ? pillActive : pillIdle}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Container type list */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(20,83,45,0.42)' }}>Type</p>
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
