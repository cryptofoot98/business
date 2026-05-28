import { Icon } from '../Icon';
import { CostingSettings, ProductCategory, ClearanceType, AgentPortKey } from '../../types/costing';
import { PRODUCT_CATEGORIES, DUTY_RATES, AGENT_PORT_RATES, INSURANCE_PER_FCL_GBP } from '../../data/costingRates';

interface Props {
  settings: CostingSettings;
  onUpdate: (s: CostingSettings) => void;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-widest whitespace-nowrap"
      style={{ color: 'rgba(90, 74, 61, 0.5)', background: 'rgba(245, 158, 11, 0.05)', borderBottom: '1px solid rgba(245, 158, 11, 0.12)' }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.07)' }}>
      {children}
    </td>
  );
}

function RateInput({
  value, onChange, prefix,
}: {
  value: number; onChange: (v: number) => void; prefix?: string;
}) {
  return (
    <div className="flex items-center overflow-hidden" style={{
      background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 8, width: 110,
    }}>
      {prefix && (
        <span className="px-2 py-1.5 font-mono text-[10px] font-bold select-none shrink-0"
          style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)', borderRight: '1px solid rgba(245, 158, 11, 0.15)' }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value} min={0} step={0.001}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-2 py-1.5 bg-transparent text-xs font-mono focus:outline-none"
        style={{ color: '#1a1410', width: 70 }}
      />
    </div>
  );
}

function SectionBox({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(245, 158, 11, 0.18)', borderRadius: 16, overflow: 'hidden' }}>
      <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
        <p className="font-bold text-xs uppercase tracking-widest text-white">{title}</p>
        {note && <p className="font-mono text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{note}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsTab({ settings, onUpdate }: Props) {

  function updateDuty(cat: ProductCategory, clearance: ClearanceType, rate: number) {
    const cur = settings.dutyRates[cat][clearance];
    onUpdate({
      ...settings,
      dutyRates: {
        ...settings.dutyRates,
        [cat]: {
          ...settings.dutyRates[cat],
          [clearance]: { ...cur, rate },
        },
      },
    });
  }

  function updateDutyType(cat: ProductCategory, clearance: ClearanceType, type: 'per_kg' | 'per_tonne') {
    const cur = settings.dutyRates[cat][clearance];
    onUpdate({
      ...settings,
      dutyRates: {
        ...settings.dutyRates,
        [cat]: {
          ...settings.dutyRates[cat],
          [clearance]: { ...cur, type },
        },
      },
    });
  }

  function updateAgent(key: AgentPortKey, field: 'healthExamGBP' | 'portChargesGBP', val: number) {
    onUpdate({
      ...settings,
      agentPortRates: {
        ...settings.agentPortRates,
        [key]: { ...settings.agentPortRates[key], [field]: val },
      },
    });
  }

  function updateInsurance(val: number) {
    onUpdate({ ...settings, insurancePerFCL: val });
  }

  function resetToDefaults() {
    onUpdate({
      dutyRates: DUTY_RATES,
      agentPortRates: AGENT_PORT_RATES,
      insurancePerFCL: INSURANCE_PER_FCL_GBP,
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Info bar */}
      <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.07)', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
        <Icon name="info" size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
        <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(90, 74, 61, 0.7)' }}>
          Override the default duty rates, agent/port charges, and insurance amount here. Changes are saved automatically and apply to all tabs. Reset to factory defaults at any time.
        </p>
        <button
          onClick={resetToDefaults}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase rounded-full"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}
        >
          <Icon name="reset" size={10} /> Reset defaults
        </button>
      </div>

      {/* Duty rates */}
      <SectionBox title="Duty Rates by Product Category" note="Edit rates used in duty calculation. These override the built-in spreadsheet values.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <Th>Product Category</Th>
                <Th>Licence — Type</Th>
                <Th>Licence — Rate</Th>
                <Th>Full Duty — Type</Th>
                <Th>Full Duty — Rate</Th>
                <Th>Preview (licence / full)</Th>
              </tr>
            </thead>
            <tbody>
              {PRODUCT_CATEGORIES.map(({ value: cat, label }) => {
                const lic = settings.dutyRates[cat].licence;
                const full = settings.dutyRates[cat].full_duty;
                return (
                  <tr key={cat}>
                    <Td>
                      <span className="font-mono text-[10px] font-bold" style={{ color: '#1a1410' }}>{label}</span>
                    </Td>
                    <Td>
                      <select
                        value={lic.type} onChange={e => updateDutyType(cat, 'licence', e.target.value as 'per_kg' | 'per_tonne')}
                        className="px-2 py-1 text-[10px] font-mono focus:outline-none appearance-none"
                        style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, color: '#1a1410' }}>
                        <option value="per_kg">£/kg</option>
                        <option value="per_tonne">£/tonne</option>
                      </select>
                    </Td>
                    <Td>
                      <RateInput value={lic.rate} onChange={v => updateDuty(cat, 'licence', v)} prefix="£" />
                    </Td>
                    <Td>
                      <select
                        value={full.type} onChange={e => updateDutyType(cat, 'full_duty', e.target.value as 'per_kg' | 'per_tonne')}
                        className="px-2 py-1 text-[10px] font-mono focus:outline-none appearance-none"
                        style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, color: '#1a1410' }}>
                        <option value="per_kg">£/kg</option>
                        <option value="per_tonne">£/tonne</option>
                      </select>
                    </Td>
                    <Td>
                      <RateInput value={full.rate} onChange={v => updateDuty(cat, 'full_duty', v)} prefix="£" />
                    </Td>
                    <Td>
                      <span className="font-mono text-[9px]" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>
                        {lic.type === 'per_kg' ? `£${lic.rate.toFixed(3)}/kg` : `£${lic.rate.toLocaleString()}/t`}
                        {' / '}
                        {full.type === 'per_kg' ? `£${full.rate.toFixed(3)}/kg` : `£${full.rate.toLocaleString()}/t`}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionBox>

      {/* Agent/port charges */}
      <SectionBox title="Customs Agent & Port Charges" note="Health examination and port handling charges per container (£).">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <Th>Agent / Port</Th>
                <Th>Health exam (£)</Th>
                <Th>Port charges (£)</Th>
                <Th>Total / container</Th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(settings.agentPortRates) as AgentPortKey[]).map(key => {
                const info = settings.agentPortRates[key];
                return (
                  <tr key={key}>
                    <Td>
                      <div>
                        <p className="font-mono text-[10px] font-bold" style={{ color: '#1a1410' }}>{info.agent}</p>
                        <p className="font-mono text-[9px]" style={{ color: 'rgba(90, 74, 61, 0.5)' }}>{info.port}</p>
                      </div>
                    </Td>
                    <Td>
                      <RateInput value={info.healthExamGBP} onChange={v => updateAgent(key, 'healthExamGBP', v)} prefix="£" />
                    </Td>
                    <Td>
                      <RateInput value={info.portChargesGBP} onChange={v => updateAgent(key, 'portChargesGBP', v)} prefix="£" />
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-bold" style={{ color: '#1a1410' }}>
                        £{(info.healthExamGBP + info.portChargesGBP).toFixed(2)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionBox>

      {/* Insurance */}
      <SectionBox title="Insurance Default" note="Flat-rate insurance applied per FCL when 'Auto' is selected.">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <RateInput value={settings.insurancePerFCL} onChange={updateInsurance} prefix="£" />
            <span className="font-mono text-xs" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>per FCL container</span>
          </div>
          <p className="font-mono text-[9px] mt-2" style={{ color: 'rgba(90, 74, 61, 0.4)' }}>
            Default: £{INSURANCE_PER_FCL_GBP.toFixed(2)} — divided by cases per container to give cost per case.
          </p>
        </div>
      </SectionBox>

      {/* Transport reference */}
      <SectionBox title="Default Transport Reference" note="Reference transport costs shown in route comparison. Edit these from the main costing form or bulk settings.">
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(settings.agentPortRates) as AgentPortKey[]).map(key => {
              const info = settings.agentPortRates[key];
              return (
                <div key={key} className="p-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
                  <p className="font-mono text-[9px] font-bold uppercase" style={{ color: 'rgba(90, 74, 61, 0.6)' }}>{info.port}</p>
                  <p className="font-mono text-[9px]" style={{ color: 'rgba(90, 74, 61, 0.4)' }}>{info.agent}</p>
                  <p className="font-mono text-xs font-bold mt-1" style={{ color: '#1a1410' }}>
                    £{(info.healthExamGBP + info.portChargesGBP).toFixed(2)} clearance
                  </p>
                </div>
              );
            })}
          </div>
          <p className="font-mono text-[9px] mt-3" style={{ color: 'rgba(90, 74, 61, 0.4)' }}>
            Transport costs (port → warehouse) vary by destination and are entered per-calculation in the Import Route section.
          </p>
        </div>
      </SectionBox>
    </div>
  );
}
