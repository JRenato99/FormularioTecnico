import React from 'react';
import './ui.css';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  return (
    <button 
      className={`ui-btn ui-btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, id, error, className = '', ...props }) => {
  return (
    <div className={`ui-input-wrapper ${className}`}>
      {label && <label htmlFor={id} className="ui-label">{label}</label>}
      <input id={id} className={`ui-input ${error ? 'ui-input-error' : ''}`} {...props} />
      {error && <span className="ui-error-text">{error}</span>}
    </div>
  );
};

export const Select = ({ label, id, options, error, className = '', ...props }) => {
  return (
    <div className={`ui-input-wrapper ${className}`}>
      {label && <label htmlFor={id} className="ui-label">{label}</label>}
      <select id={id} className={`ui-select ${error ? 'ui-input-error' : ''}`} {...props}>
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="ui-error-text">{error}</span>}
    </div>
  );
};

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`ui-card glass-panel ${className}`} {...props}>
      {children}
    </div>
  );
};
