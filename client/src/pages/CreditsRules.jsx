import { useState, useContext } from 'react';
import AdminLayout from '../components/AdminLayout';
import AuthContext from '../context/AuthContext';
import { Award, Edit2, Save, X, AlertCircle } from 'lucide-react';

const CreditsRules = () => {
    const { user } = useContext(AuthContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [showToast, setShowToast] = useState(false);

    // Mock Data
    const [categories, setCategories] = useState([
        { id: 1, name: 'Technical', credits: 50, description: 'Hackathons, coding competitions, workshops' },
        { id: 2, name: 'Cultural', credits: 30, description: 'Dance, music, drama, art exhibitions' },
        { id: 3, name: 'Sports', credits: 40, description: 'Inter-college tournaments, intramurals' },
        { id: 4, name: 'Social Service', credits: 20, description: 'Volunteering, blood donation camps' },
        { id: 5, name: 'Leadership', credits: 25, description: 'Organizing events, student council roles' },
    ]);

    const handleEditClick = (category) => {
        setSelectedCategory(category);
        setEditValue(category.credits);
        setIsModalOpen(true);
    };

    const handleSave = () => {
        const updatedCategories = categories.map(cat =>
            cat.id === selectedCategory.id ? { ...cat, credits: parseInt(editValue) } : cat
        );
        setCategories(updatedCategories);
        setIsModalOpen(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <AdminLayout user={user} title="Credits Rules">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">Credit Configuration</h2>
                <p className="text-gray-400">Manage the credit points assigned to different event categories.</p>
            </div>

            {/* Summary Card */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl mb-8 flex items-start gap-4">
                <div className="bg-indigo-500/20 p-3 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-indigo-300">Total Credit Calculation</h3>
                    <p className="text-indigo-400 mt-1 text-sm">
                        Students earn credits based on the category of events they participate in.
                        Changes made here will apply to all future event participations.
                        Past records will remain unchanged.
                    </p>
                </div>
            </div>

            {/* Credits Table */}
            <div className="glass-card overflow-hidden border border-white/10">
                <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Category Name</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Description</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Credits per Event</th>
                            <th className="text-right py-4 px-6 text-sm font-semibold text-gray-300">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center text-indigo-400">
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-white">{category.name}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-sm text-gray-400">{category.description}</td>
                                <td className="py-4 px-6">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        {category.credits} Points
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button
                                        onClick={() => handleEditClick(category)}
                                        className="text-gray-400 hover:text-indigo-400 transition-colors p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="glass-card shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/10">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white">Edit Credits</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Category</label>
                                <input
                                    type="text"
                                    value={selectedCategory?.name}
                                    disabled
                                    className="w-full px-4 py-3 input-dark opacity-70 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">Credits Points</label>
                                <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-full px-4 py-3 input-dark font-bold text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-300 font-medium hover:bg-white/10 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-400 hover:to-purple-500 transition-colors flex items-center gap-2 shadow-glow"
                            >
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-gray-900 border border-white/10 text-white px-6 py-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-[60]">
                    <div className="w-6 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="font-medium text-emerald-50">Credits updated successfully!</span>
                </div>
            )}
        </AdminLayout>
    );
};

export default CreditsRules;
