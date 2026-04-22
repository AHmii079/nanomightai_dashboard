import React, { useState, useEffect, useRef } from 'react';
import './DateRangePicker.css';

const DateRangePicker = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  onApply
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('day'); // 'day' or 'hour'
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localEndDate, setLocalEndDate] = useState(endDate || '');
  const [localStartTime, setLocalStartTime] = useState(startTime || '');
  const [localEndTime, setLocalEndTime] = useState(endTime || '');

  const popoverRef = useRef(null);

  useEffect(() => {
    setLocalStartDate(startDate || '');
    setLocalEndDate(endDate || '');
    setLocalStartTime(startTime || '');
    setLocalEndTime(endTime || '');
  }, [startDate, endDate, startTime, endTime, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const padZero = (num) => String(num).padStart(2, '0');

  const handleDateClick = (day) => {
    const clickedDateStr = `${currentMonth.getFullYear()}-${padZero(currentMonth.getMonth() + 1)}-${padZero(day)}`;
    
    if (!localStartDate || (localStartDate && localEndDate)) {
      setLocalStartDate(clickedDateStr);
      setLocalEndDate('');
    } else {
      const sd = new Date(localStartDate);
      const cd = new Date(clickedDateStr);
      if (cd < sd) {
        setLocalStartDate(clickedDateStr);
      } else {
        setLocalEndDate(clickedDateStr);
      }
    }
  };

  const getDayClass = (day) => {
    const dStr = `${currentMonth.getFullYear()}-${padZero(currentMonth.getMonth() + 1)}-${padZero(day)}`;
    let classes = ['calendar-day'];
    
    if (dStr === localStartDate) classes.push('selected start');
    if (dStr === localEndDate) classes.push('selected end');
    if (localStartDate && localEndDate && dStr > localStartDate && dStr < localEndDate) {
      classes.push('in-range');
    }
    
    // Highlight today
    const now = new Date();
    if (dStr === `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`) {
      classes.push('today');
    }
    
    return classes.join(' ');
  };

  const handleApply = () => {
    let finalEndDate = localEndDate;
    let finalEndTime = localEndTime;

    if (localStartDate && !localEndDate) {
      const now = new Date();
      finalEndDate = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`;
      finalEndTime = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
    }

    setStartDate(localStartDate);
    setEndDate(finalEndDate);
    setStartTime(localStartTime);
    setEndTime(finalEndTime);
    
    setIsOpen(false);
    
    if (onApply) {
      // Pass the final values to onApply just in case it's using them instantly, though it often uses state
      setTimeout(() => onApply(), 50);
    }
  };

  const handleReset = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalStartTime('');
    setLocalEndTime('');
    
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    
    if (onApply) {
      setTimeout(() => onApply(), 50);
    }
  };

  const formatDateForDisplay = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  };

  const getDisplayValue = () => {
    if (!startDate && !endDate && !startTime && !endTime) return "Select Date/Time Range";
    
    const startStr = startDate ? `${formatDateForDisplay(startDate)}${startTime ? ' ' + startTime : ''}` : '';
    const endStr = endDate ? `${formatDateForDisplay(endDate)}${endTime ? ' ' + endTime : ''}` : '';
    
    if (startStr && endStr) return `${startStr}  →  ${endStr}`;
    if (startStr) return startStr;
    return "Select Date/Time Range";
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="daterangepicker-container" ref={popoverRef}>
      <div className="picker-input-wrapper" onClick={() => setIsOpen(!isOpen)}>
        <i className="bi bi-calendar picker-icon"></i>
        <div className="picker-value">{getDisplayValue()}</div>
        <i className="bi bi-chevron-down picker-caret"></i>
      </div>

      {isOpen && (
        <div className="picker-popover">
          <div className="picker-header-tabs">
            <div className="view-toggle">
              <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>day</button>
              <button className={view === 'hour' ? 'active' : ''} onClick={() => setView('hour')}>hour</button>
            </div>
          </div>

          {view === 'day' ? (
            <div className="picker-calendar">
              <div className="calendar-header">
                <button onClick={prevMonth} className="nav-btn"><i className="bi bi-chevron-left"></i></button>
                <div className="month-year-title">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                <button onClick={nextMonth} className="nav-btn"><i className="bi bi-chevron-right"></i></button>
              </div>
              
              <div className="calendar-grid">
                <div className="weekday">Su</div>
                <div className="weekday">Mo</div>
                <div className="weekday">Tu</div>
                <div className="weekday">We</div>
                <div className="weekday">Th</div>
                <div className="weekday">Fr</div>
                <div className="weekday">Sa</div>
                
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="calendar-day empty"></div>
                ))}
                
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  return (
                    <div 
                      key={day} 
                      className={getDayClass(day)}
                      onClick={() => handleDateClick(day)}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="picker-time-view">
              <div className="time-group">
                <label>Start Time</label>
                <input 
                  type="time" 
                  className="time-input" 
                  value={localStartTime} 
                  onChange={(e) => setLocalStartTime(e.target.value)} 
                />
              </div>
              <div className="time-group mt-3">
                <label>End Time</label>
                <input 
                  type="time" 
                  className="time-input" 
                  value={localEndTime} 
                  onChange={(e) => setLocalEndTime(e.target.value)} 
                />
              </div>
              <p className="time-hint">Times are in US Eastern Time (EST/EDT)</p>
            </div>
          )}

          <div className="picker-footer">
            <button className="btn-reset" onClick={handleReset}>Reset</button>
            <button className="btn-apply" onClick={handleApply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
