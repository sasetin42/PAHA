import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ClinicLocation {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    headVeterinarian?: string;
    image?: string;
    phone?: string;
    email?: string;
}

interface ClinicMapProps {
    clinics: ClinicLocation[];
    selectedClinicId?: string | null;
    onClinicSelect?: (clinicId: string) => void;
}

// Component to handle map movement
const MapUpdater: React.FC<{ center: [number, number], zoom: number, selectedId?: string | null }> = ({ center, zoom, selectedId }) => {
    const map = useMap();

    useEffect(() => {
        if (selectedId) {
            map.flyTo(center, zoom, {
                duration: 1.5
            });
        }
    }, [center, zoom, map, selectedId]);

    return null;
};

const ClinicMap: React.FC<ClinicMapProps> = ({ clinics, selectedClinicId, onClinicSelect }) => {
    // Default center (Manila)
    const defaultCenter: [number, number] = [14.5995, 120.9842];
    const defaultZoom = 10;

    const selectedClinic = clinics.find(c => c.id === selectedClinicId);
    const mapCenter = selectedClinic ? [selectedClinic.lat, selectedClinic.lng] as [number, number] : defaultCenter;

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/10 relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater
                    center={mapCenter}
                    zoom={selectedClinic ? 16 : defaultZoom}
                    selectedId={selectedClinicId}
                />

                {clinics.map(clinic => (
                    <Marker
                        key={clinic.id}
                        position={[clinic.lat, clinic.lng]}
                        eventHandlers={{
                            click: () => {
                                onClinicSelect?.(clinic.id);
                            },
                        }}
                    >
                        <Popup>
                            <div className="min-w-[180px] max-w-[220px]">
                                {clinic.image && (
                                    <img src={clinic.image} alt={clinic.name} className="w-full h-[74px] object-cover rounded-md mb-1.5" />
                                )}
                                <h3 className="font-bold text-[13px] text-slate-900 leading-tight mb-1.5 m-0">{clinic.name}</h3>
                                
                                <div className="space-y-1">
                                    <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                                        <span className="material-symbols-outlined text-[13px] text-blue-500 shrink-0 mt-0.5 select-none">location_on</span>
                                        <span className="leading-snug">{clinic.address}</span>
                                    </div>
                                    
                                    {clinic.headVeterinarian && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                            <span className="material-symbols-outlined text-[13px] text-emerald-500 shrink-0 select-none">medical_services</span>
                                            <span className="font-medium text-slate-700 truncate">
                                                {clinic.headVeterinarian.trim().toLowerCase().startsWith('dr')
                                                    ? clinic.headVeterinarian
                                                    : `Dr. ${clinic.headVeterinarian}`
                                                }
                                            </span>
                                        </div>
                                    )}

                                    {clinic.phone && clinic.phone !== 'N/A' && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                            <span className="material-symbols-outlined text-[13px] text-purple-500 shrink-0 select-none">phone</span>
                                            <span>{clinic.phone}</span>
                                        </div>
                                    )}

                                    {clinic.email && clinic.email !== 'N/A' && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                            <span className="material-symbols-outlined text-[13px] text-pink-500 shrink-0 select-none">mail</span>
                                            <span className="truncate max-w-[150px]">{clinic.email}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <button
                                    onClick={() => onClinicSelect?.(clinic.id)}
                                    className="mt-2.5 w-full bg-primary text-white text-[10px] py-1 rounded-md font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-sm flex items-center justify-center gap-1"
                                >
                                    Focus on List
                                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default ClinicMap;
