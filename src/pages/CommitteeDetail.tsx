import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const CommitteeDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { committeeMembers } = useAdmin();
    const members = id ? committeeMembers.filter(m => m.committeeId === id) : undefined;
    const committeeName = id?.replace('-', ' ');

    return (
        <div className="min-h-screen bg-gray-50 hero-pt pb-16">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-100 py-16 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 text-center md:text-left">
                        <Link
                            to="/committees"
                            className="inline-flex items-center gap-2 text-primary font-semibold mb-6 hover:gap-3 transition-all underline decoration-primary/30 underline-offset-4"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Back to Committees
                        </Link>
                        <h1 className="text-4xl md:text-6xl font-semibold text-gray-900 mb-6 capitalize leading-tight">
                            {committeeName} <br />
                            <span className="text-gray-900 select-none">Committee</span>
                        </h1>
                        <div className="h-1.5 w-24 bg-primary rounded-full mx-auto md:mx-0"></div>
                    </div>
                    <div className="flex-shrink-0">
                        <img
                            src="/paha-logo.png"
                            alt="PAHA Logo"
                            className="h-24 md:h-32 opacity-80"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-16">
                {members ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                        {members.map((member, index) => (
                            <div key={index} className="flex items-start gap-6 group">
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full scale-110 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    {member.image ? (
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-2 border-white shadow-xl relative z-10 transition-all duration-500"
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                target.style.display = 'none';
                                                const fallback = target.nextElementSibling as HTMLElement;
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-white shadow-xl relative z-10 bg-primary text-white items-center justify-center text-2xl font-bold"
                                        style={{ display: member.image ? 'none' : 'flex' }}
                                    >
                                        {member.name.split(' ').filter((_: string, i: number) => i > 0).map((n: string) => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full shadow-lg z-20 scale-0 group-hover:scale-100 transition-transform duration-300">
                                        <span className="material-symbols-outlined text-sm">verified</span>
                                    </div>
                                </div>
                                <div className="flex flex-col pt-2">
                                    <h3 className="text-xl md:text-2xl font-semibold text-gray-900 group-hover:text-primary transition-colors duration-300">
                                        {member.name}
                                    </h3>
                                    <p className="text-primary font-semibold text-sm md:text-base mb-1">
                                        {member.clinic}
                                    </p>
                                    <p className="text-black font-semibold uppercase tracking-wider text-xs md:text-sm">
                                        {member.role}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-6 block">construction</span>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2 capitalize">{committeeName} Committee</h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            The member listing for this committee is currently being updated. Please check back soon.
                        </p>
                        <Link
                            to="/committees"
                            className="mt-8 inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-full font-semibold hover:bg-primary transition-all shadow-lg"
                        >
                            Explore Other Committees
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommitteeDetail;
