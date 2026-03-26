import React, { useState } from 'react';
import { ShoppingItem } from '../types';

interface ShoppingListProps {
    items: ShoppingItem[];
    onSetItems: (items: ShoppingItem[]) => void;
}

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
    produce: { label: 'Frutas y Verduras', icon: 'fa-carrot', color: 'text-orange-500' },
    meat: { label: 'Carnes y Pescados', icon: 'fa-drumstick-bite', color: 'text-red-500' },
    dairy: { label: 'Lácteos y Huevos', icon: 'fa-egg', color: 'text-yellow-500' },
    pantry: { label: 'Despensa y Básicos', icon: 'fa-box-open', color: 'text-blue-500' },
    other: { label: 'Otros', icon: 'fa-shopping-bag', color: 'text-slate-500' }
};

const ShoppingList: React.FC<ShoppingListProps> = ({ items, onSetItems }) => {
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<ShoppingItem['category']>('produce');

    const toggleCheck = (id: string) => {
        onSetItems(items.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const deleteItem = (id: string) => {
        onSetItems(items.filter(item => item.id !== id));
    };

    const clearCompleted = () => {
        if (window.confirm('¿Borrar todos los elementos completados?')) {
            onSetItems(items.filter(item => !item.checked));
        }
    };

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        const newItem: ShoppingItem = {
            id: Date.now().toString(),
            name: newItemName,
            amount: '1',
            category: newItemCategory,
            checked: false
        };
        onSetItems([newItem, ...items]);
        setNewItemName('');
    };

    // Group items by category
    const groupedItems = Object.keys(CATEGORIES).reduce((acc, cat) => {
        const catItems = items.filter(i => i.category === cat);
        if (catItems.length > 0) acc[cat] = catItems;
        return acc;
    }, {} as Record<string, ShoppingItem[]>);

    const totalItems = items.length;
    const completedItems = items.filter(i => i.checked).length;
    const progress = totalItems === 0 ? 0 : (completedItems / totalItems) * 100;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 max-w-4xl mx-auto pb-24 shopping-list-print-area">
            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .shopping-list-print-area, .shopping-list-print-area * {
                        visibility: visible;
                    }
                    .shopping-list-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px;
                        background: white !important;
                        max-width: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Ensure backgrounds print for categories if user hasn't enabled it, or force simple text */
                    /* Simplifying for print legibility */
                    .shadow-sm, .shadow-lg {
                        box-shadow: none !important;
                        border: 1px solid #eee !important;
                    }
                }
            `}</style>

            {/* Header & Progress */}
            <div className="mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Lista de Compras</h1>
                        <p className="text-slate-500 no-print">Organiza tu semana para no comprar de más</p>
                    </div>
                    <div className="text-right no-print">
                        <p className="text-2xl font-bold text-emerald-600">{completedItems}/{totalItems}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Completado</p>
                    </div>
                </div>

                <div className="h-3 bg-slate-100 rounded-full overflow-hidden no-print">
                    <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="mt-4 flex justify-end gap-3 no-print">
                    <button
                        onClick={handlePrint}
                        className="text-xs text-slate-600 hover:text-emerald-700 font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
                    >
                        <i className="fas fa-print"></i> Imprimir Lista
                    </button>
                    {completedItems > 0 && (
                        <button
                            onClick={clearCompleted}
                            className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                        >
                            <i className="fas fa-trash-alt"></i> Limpiar completados
                        </button>
                    )}
                </div>
            </div>

            {/* Add New Item Form */}
            <form onSubmit={addItem} className="mb-8 flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 no-print">
                <input
                    type="text"
                    placeholder="¿Qué necesitas comprar?"
                    className="flex-1 bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                />
                <div className="flex gap-2">
                    <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as any)}
                        className="bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-600 font-medium cursor-pointer"
                    >
                        {Object.entries(CATEGORIES).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20">
                        <i className="fas fa-plus"></i>
                    </button>
                </div>
            </form>

            {/* Grouped Lists */}
            {items.length === 0 ? (
                <div className="p-10 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 border-dashed">
                    <i className="fas fa-shopping-basket text-4xl mb-4 opacity-50 text-emerald-200"></i>
                    <p>Tu lista está vacía. ¡Agrega alimentos manualmente o desde tu plan semanal!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedItems).map(([catKey, catItems]) => (
                        <div key={catKey} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden break-inside-avoid">
                            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                                <i className={`fas ${CATEGORIES[catKey].icon} ${CATEGORIES[catKey].color}`}></i>
                                <h3 className="font-bold text-slate-700">{CATEGORIES[catKey].label}</h3>
                                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold ml-auto">
                                    {catItems.length}
                                </span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {catItems.map(item => (
                                    <div key={item.id} className={`p-4 flex items-center justify-between group transition duration-200 ${item.checked ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50'}`}>
                                        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleCheck(item.id)}>
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked
                                                ? 'bg-emerald-500 border-emerald-500 text-white scale-110'
                                                : 'border-slate-200 text-transparent hover:border-emerald-400'
                                                }`}>
                                                <i className="fas fa-check text-[10px]"></i>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-base font-medium transition ${item.checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                    {item.name}
                                                </span>
                                                {item.amount !== '1' && (
                                                    <span className="text-xs text-slate-400 font-bold">{item.amount}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition no-print"
                                        >
                                            <i className="fas fa-trash-alt text-sm"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ShoppingList;
