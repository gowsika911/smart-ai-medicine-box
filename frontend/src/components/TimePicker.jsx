// A 12-hour time picker (hour / minute / AM-PM) that stores and reports
// its value as a 24-hour "HH:mm" string, so it's a drop-in replacement
// for <input type="time"> without changing anything on the backend.

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

function parseValue(value) {
  if (!value) {
    return { hour12: 8, minute: 0, period: 'AM' };
  }
  const [hour24, minute] = value.split(':').map(Number);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

function toValue(hour12, minute, period) {
  let hour24 = hour12 % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function TimePicker({ value, onChange, id }) {
  const { hour12, minute, period } = parseValue(value);

  const handleHourChange = (e) => {
    onChange(toValue(Number(e.target.value), minute, period));
  };

  const handleMinuteChange = (e) => {
    onChange(toValue(hour12, Number(e.target.value), period));
  };

  const handlePeriodChange = (e) => {
    onChange(toValue(hour12, minute, e.target.value));
  };

  return (
    <div className="time-picker" id={id}>
      <select value={hour12} onChange={handleHourChange} aria-label="Hour">
        {HOURS_12.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="time-picker-colon">:</span>
      <select value={minute} onChange={handleMinuteChange} aria-label="Minute">
        {MINUTES.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </select>
      <select value={period} onChange={handlePeriodChange} aria-label="AM or PM" className="time-picker-period">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

export default TimePicker;
