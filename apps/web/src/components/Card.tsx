import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, className = '', onClick }: CardProps) => {
  return <div className={`bg-white rounded-lg shadow-md p-6 ${className}`} onClick={onClick}>{children}</div>;
};
