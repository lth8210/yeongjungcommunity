import React from 'react';

function Button({ children, onClick, variant = 'primary', ...props }) {
  return (
    <button
      className={`btn ${variant}`}
      onClick={onClick}
      {...props}
      aria-label={props['aria-label'] || children}
    >
      {children}
    </button>
  );
}

export default Button;