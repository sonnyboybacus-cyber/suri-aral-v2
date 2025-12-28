import React, { useState } from 'react';
import { SchoolInfo, SchoolRoom } from '../../../types';
import { GridIcon, PlusIcon, TrashIcon, SpinnerIcon, SearchIcon } from '../../icons';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAcademicConfig } from '../../../hooks/useAcademicConfig';

// Fix for Leaflet marker icons
const iconPerson = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Map Components
const LocationMarker = ({ position, setPosition }: { position: { lat: number, lng: number }, setPosition: (pos: { lat: number, lng: number }) => void }) => {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker position={position} icon={iconPerson} />
    );
};

const ChangeView = ({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) => {
    const map = useMap();
    map.flyTo(center, zoom);
    return null;
};

interface SchoolFacilitiesFormProps {
    currentSchool: Omit<SchoolInfo, 'id' | 'deletedAt'>;
    setCurrentSchool: React.Dispatch<React.SetStateAction<Omit<SchoolInfo, 'id' | 'deletedAt'>>>;
}

export const SchoolFacilitiesForm: React.FC<SchoolFacilitiesFormProps> = ({
    currentSchool,
    setCurrentSchool
}) => {
    const { config } = useAcademicConfig();
    const [mapSearch, setMapSearch] = useState('');
    const [isSearchingMap, setIsSearchingMap] = useState(false);

    // Dynamic Options with Fallbacks
    const roomTypes = config?.roomTypes?.length ? config.roomTypes : ['Instructional', 'Laboratory', 'Library', 'Clinic', 'Office', 'ICT Lab', 'Other'];
    const roomConditions = config?.roomConditions?.length ? config.roomConditions : ['Good', 'Needs Repair', 'Condemned'];

    const handleSearchLocation = async () => {
        if (!mapSearch) return;
        setIsSearchingMap(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                setCurrentSchool(prev => ({
                    ...prev,
                    location: { lat: parseFloat(lat), lng: parseFloat(lon), address: display_name }
                }));
            } else {
                alert("Location not found.");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to search location.");
        } finally {
            setIsSearchingMap(false);
        }
    };

    const handleAddRoom = () => {
        const newRoom: SchoolRoom = {
            id: crypto.randomUUID(),
            roomNumber: `Rm ${(currentSchool.rooms?.length || 0) + 1}`,
            type: roomTypes[0],
            capacity: 40,
            condition: roomConditions[0]
        };
        setCurrentSchool(prev => ({ ...prev, rooms: [...(prev.rooms || []), newRoom] }));
    };

    const handleUpdateRoom = (index: number, field: keyof SchoolRoom, value: any) => {
        const updatedRooms = [...(currentSchool.rooms || [])];
        updatedRooms[index] = { ...updatedRooms[index], [field]: value };
        setCurrentSchool(prev => ({ ...prev, rooms: updatedRooms }));
    };

    const handleRemoveRoom = (index: number) => {
        const updatedRooms = (currentSchool.rooms || []).filter((_, i) => i !== index);
        setCurrentSchool(prev => ({ ...prev, rooms: updatedRooms }));
    };

    return (
        <div className="p-8 space-y-8">
            {/* Map Section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-[500px] flex flex-col">
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={mapSearch}
                            onChange={e => setMapSearch(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSearchLocation()}
                            className="w-full pl-10 p-2.5 input-field"
                            placeholder="Search location address..."
                        />
                    </div>
                    <button onClick={handleSearchLocation} disabled={isSearchingMap} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
                        {isSearchingMap ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : 'Search'}
                    </button>
                </div>

                <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
                    {typeof window !== 'undefined' && (
                        <MapContainer center={currentSchool.location || { lat: 14.5995, lng: 120.9842 }} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {currentSchool.location && (
                                <>
                                    <ChangeView center={currentSchool.location} zoom={15} />
                                    <LocationMarker
                                        position={currentSchool.location}
                                        setPosition={(pos) => setCurrentSchool(prev => ({ ...prev, location: { ...prev.location!, ...pos } }))}
                                    />
                                </>
                            )}
                        </MapContainer>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">{currentSchool.location?.address || 'Click on map to set location'}</p>
            </div>

            {/* Rooms / Facilities */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center">
                        <GridIcon className="w-4 h-4 mr-2 text-indigo-500" />
                        School Facilities
                    </h3>
                    <button type="button" onClick={handleAddRoom} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center">
                        <PlusIcon className="w-3 h-3 mr-1" /> Add Room
                    </button>
                </div>

                <div className="space-y-3">
                    {(currentSchool.rooms || []).length === 0 && (
                        <p className="text-sm text-slate-400 italic text-center py-4">No facilities added yet.</p>
                    )}
                    {(currentSchool.rooms || []).map((room, index) => (
                        <div key={room.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="md:col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Room Number</label>
                                <input
                                    type="text"
                                    value={room.roomNumber}
                                    onChange={(e) => handleUpdateRoom(index, 'roomNumber', e.target.value)}
                                    className="w-full p-2 text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label>
                                <select
                                    value={room.type}
                                    onChange={(e) => handleUpdateRoom(index, 'type', e.target.value)}
                                    className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded appearance-none"
                                >
                                    {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    {/* Handle value not in list */}
                                    {room.type && !roomTypes.includes(room.type) && <option value={room.type}>{room.type}</option>}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Capacity</label>
                                <input
                                    type="number"
                                    value={room.capacity}
                                    onChange={(e) => handleUpdateRoom(index, 'capacity', parseInt(e.target.value))}
                                    className="w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Condition</label>
                                <select
                                    value={room.condition}
                                    onChange={(e) => handleUpdateRoom(index, 'condition', e.target.value)}
                                    className={`w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded appearance-none font-bold ${room.condition === 'Good' ? 'text-green-600' : room.condition === 'Needs Repair' ? 'text-amber-600' : 'text-red-600'
                                        }`}
                                >
                                    {roomConditions.map(c => <option key={c} value={c}>{c}</option>)}
                                    {/* Handle value not in list */}
                                    {room.condition && !roomConditions.includes(room.condition) && <option value={room.condition}>{room.condition}</option>}
                                </select>
                            </div>
                            <div className="md:col-span-1 flex justify-center">
                                <button type="button" onClick={() => handleRemoveRoom(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors mt-4">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
