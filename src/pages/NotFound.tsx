import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background-dark flex items-center justify-center px-6">
            <div className="text-center max-w-lg">
                <div className="mb-8">
                    <span className="text-9xl font-bold text-primary/20 dark:text-primary/10 select-none">404</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                    Page Not Found
                </h1>
                <p className="text-gray-600 dark:text-metallic mb-10 leading-relaxed">
                    The page you're looking for doesn't exist or has been moved. Let's get you back on track.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">home</span>
                        Back to Home
                    </Link>
                    <Link
                        to="/contact"
                        className="inline-flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 text-gray-700 dark:text-white px-8 py-3 rounded-xl font-semibold hover:border-primary hover:text-primary transition-colors"
                    >
                        Contact Us
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
