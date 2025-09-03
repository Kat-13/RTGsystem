import React from 'react'; 
import { Building2, Target, Plus } from 'lucide-react';

const ProductSelector = ({ currentProduct, onProductChange }) => {
  const products = [
    {
      id: 'rtg-ae',
      name: 'RTG Aligned Execution',
      description: 'Enterprise project management and execution tracking',
      icon: Target,
      color: 'blue',
      status: 'active'
    },
    {
      id: 'banking-pm',
      name: 'Banking Project Management',
      description: 'Regulatory-compliant project management for financial institutions',
      icon: Building2,
      color: 'green',
      status: 'active'
    },
    {
      id: 'future-product',
      name: 'Future FastLynk Products',
      description: 'Expandable platform for additional enterprise solutions',
      icon: Plus,
      color: 'gray',
      status: 'coming-soon'
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">FastLynk Product Suite</h2>
              <p className="text-sm text-gray-600">Select a product to manage</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map((product) => {
              const Icon = product.icon;
              const isActive = currentProduct === product.id;
              const isComingSoon = product.status === 'coming-soon';
              
              return (
                <button
                  key={product.id}
                  onClick={() => !isComingSoon && onProductChange(product.id)}
                  disabled={isComingSoon}
                  className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    isActive
                      ? `border-${product.color}-500 bg-${product.color}-50`
                      : isComingSoon
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isActive
                        ? `bg-${product.color}-100`
                        : isComingSoon
                        ? 'bg-gray-100'
                        : `bg-${product.color}-100`
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isActive
                          ? `text-${product.color}-600`
                          : isComingSoon
                          ? 'text-gray-400'
                          : `text-${product.color}-600`
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${
                        isComingSoon ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {product.name}
                        {isComingSoon && (
                          <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        isComingSoon ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {product.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;

