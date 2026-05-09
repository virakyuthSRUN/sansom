import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface AddBNPLDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (bnpl: {
    name: string;
    platform: string;
    amount: number;
    monthly: number;
    rate: number;
    status: string;
  }) => void;
}

const PLATFORMS = ['Shopee', 'Grab', 'Lazada', 'TNG', 'Boost', 'Other'];
const PROVIDERS = ['Atome', 'GrabPay Later', 'SPayLater', 'Hoolah', 'Pine', 'Other'];

const AddBNPLDialog = ({ open, onClose, onAdd }: AddBNPLDialogProps) => {
  const { currency } = useCurrency();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [amount, setAmount] = useState('');
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');
  const [status, setStatus] = useState('Active');

  if (!open) return null;

  const riskFromRate = (r: number) =>
    r < 15 ? 'LOW' : r <= 25 ? 'MEDIUM' : 'HIGH';

  const riskColor = (r: string) =>
    r === 'HIGH' ? '#ff4757' : r === 'MEDIUM' ? '#ffb300' : '#00c896';

  const previewRisk = rate ? riskFromRate(parseFloat(rate)) : null;

  const handleSubmit = () => {
    if (!name || !amount || !monthly || !rate) return;
    onAdd({
      name,
      platform: platform || 'Other',
      amount:  parseFloat((parseFloat(amount)  / currency.rate).toFixed(2)),
      monthly: parseFloat((parseFloat(monthly) / currency.rate).toFixed(2)),
      rate:    parseFloat(rate),
      status,
    });
    // reset
    setName(''); setPlatform(''); setAmount('');
    setMonthly(''); setRate(''); setStatus('Active');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground">Add BNPL Plan</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Provider name */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Provider
            </label>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {PROVIDERS.map(p => (
                <button
                  key={p}
                  onClick={() => setName(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    name === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
              placeholder="Or type custom name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Platform */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Platform
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    platform === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Monthly */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Outstanding ({currency.symbol})
              </label>
              <input
                type="number"
                className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
                placeholder="e.g. 500"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Monthly ({currency.symbol})
              </label>
              <input
                type="number"
                className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
                placeholder="e.g. 100"
                value={monthly}
                onChange={e => setMonthly(e.target.value)}
              />
            </div>
          </div>

          {/* Interest rate */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Interest Rate (% p.a.)
            </label>
            <input
              type="number"
              className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
              placeholder="e.g. 18"
              value={rate}
              onChange={e => setRate(e.target.value)}
            />
            {/* Risk preview */}
            {previewRisk && (
              <div
                className="mt-1.5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 animate-slide-up"
                style={{ background: `${riskColor(previewRisk)}15` }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: riskColor(previewRisk) }}
                />
                <p className="text-[11px] font-semibold" style={{ color: riskColor(previewRisk) }}>
                  {previewRisk} RISK
                  {previewRisk === 'LOW' && ' — Good rate'}
                  {previewRisk === 'MEDIUM' && ' — Watch this'}
                  {previewRisk === 'HIGH' && ' — Pay off ASAP'}
                </p>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Status
            </label>
            <div className="flex gap-2">
              {['Active', 'Paid Off'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                    status === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name || !amount || !monthly || !rate}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm shadow-primary hover:shadow-primary-hover transition-all mt-1 disabled:opacity-50"
          >
            Add BNPL Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBNPLDialog;