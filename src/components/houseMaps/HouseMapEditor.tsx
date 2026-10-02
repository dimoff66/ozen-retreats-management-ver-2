'use client';

import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  CSSProperties,
  DragEvent,
} from "react";
import type {
  House,
  HouseMap,
  Room,
} from "@/services/database";
import type { RoomPosition } from "@/services/houseMapsService";
import houseMapsService from "@/services/houseMapsService";
import roomsService from "@/services/roomsService";

type HouseMapEditorProps = {
  house: House;
  houseMap: HouseMap | null;
  houses: House[];
  onSaveActionClick: () => Promise<void>;
  onCancelActionClick: () => void;
};

export default function HouseMapEditor({
  house,
  houseMap,
  houses,
  onSaveActionClick,
  onCancelActionClick,
}: HouseMapEditorProps) {
  const strCreateTitle = "Create map";
  const strEditTitle = "Edit map";
  const strRooms = "Rooms";
  const strBackgroundImage = "Background image";
  const strChooseImage = "Choose image";
  const strNoImage = "No background image";
  const strSave = "Save";
  const strCancel = "Cancel";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load rooms.";
  const strNoUnplacedRooms = "All rooms are placed";

  const mapRef = useRef<HTMLDivElement | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomPositions, setRoomPositions] = useState<RoomPosition[]>([]);
  const [backgroundUrl, setBackgroundUrl] = useState(houseMap?.bg_image_url ?? "");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [draggedRoomId, setDraggedRoomId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = houseMap !== null;
  const formTitle = isEditMode ? strEditTitle : strCreateTitle;
  const imageUrl = previewUrl || backgroundUrl;
  const hasImage = imageUrl !== "";

  const loadRooms = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const allRooms = await roomsService.getRooms();
      const availableRooms = houseMapsService.getRoomsForHouseMap(
        house,
        houses,
        allRooms
      );

      setRooms(availableRooms);
      setRoomPositions(houseMapsService.getRoomPositions(houseMap));
    } catch {
      setIsLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onBackgroundChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const newPreviewUrl = URL.createObjectURL(file);

    setBackgroundFile(file);
    setPreviewUrl(newPreviewUrl);
  };

  const onDragOverHandler = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onDropHandler = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (draggedRoomId === null || !mapRef.current) {
      return;
    }

    const mapRect = mapRef.current.getBoundingClientRect();

    const x = Math.round(
      ((event.clientX - mapRect.left) / mapRect.width) * 10000
    ) / 100;

    const y = Math.round(
      ((event.clientY - mapRect.top) / mapRect.height) * 10000
    ) / 100;

    const newPositions = houseMapsService.setRoomPosition(
      draggedRoomId,
      x,
      y,
      roomPositions
    );

    setRoomPositions(newPositions);
    setDraggedRoomId(null);
  };

  const onSaveHandler = async () => {
    setIsSaving(true);

    try {
      let savedBackgroundUrl = backgroundUrl;

      if (backgroundFile) {
        savedBackgroundUrl = await houseMapsService.uploadBackground(
          house.id,
          backgroundFile
        );
      }

      if (houseMap) {
        await houseMapsService.updateHouseMap(
          houseMap.id,
          savedBackgroundUrl || null,
          roomPositions
        );
      } else {
        await houseMapsService.createHouseMap(
          house.id,
          savedBackgroundUrl || null,
          roomPositions
        );
      }

      await onSaveActionClick();
    } finally {
      setIsSaving(false);
    }
  };

  const availableRooms = houseMapsService.getUnplacedRooms(
    rooms,
    roomPositions
  );

  const availableRoomItems = availableRooms.map((room) => {
    const label = houseMapsService.getRoomLabel(room, house, houses);

    const onDragStart = () => {
      setDraggedRoomId(room.id);
    };

    return {
      id: room.id,
      label,
      onDragStart,
    };
  });

  const placedRoomItems = roomPositions
    .map((position) => {
      const room = rooms.find((item) => item.id === position.room_id);

      if (!room) {
        return null;
      }

      const label = houseMapsService.getRoomLabel(room, house, houses);

      const onDragStart = () => {
        setDraggedRoomId(room.id);
      };

      const style: CSSProperties = {
        left: `${position.x}%`,
        top: `${position.y}%`,
      };

      return {
        id: room.id,
        label,
        style,
        onDragStart,
      };
    })
    .filter((item) => item !== null);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/30 p-6">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold">{formTitle}: {house.name}</h2>
          <div className="flex gap-2">
            <button type="button" onClick={onCancelActionClick} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold">{strCancel}</button>
            <button type="button" onClick={onSaveHandler} disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{strSave}</button>
          </div>
        </div>
        {isLoading ? <div className="p-6">{strLoading}</div> : null}
        {isLoadError ? <div className="p-6">{strLoadError}</div> : null}
        {!isLoading && !isLoadError ? (
          <div className="flex min-h-0 flex-1">
            <div className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-4 font-semibold">{strRooms}</h3>
              <div className="flex flex-col gap-2">
                {availableRoomItems.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    draggable
                    onDragStart={room.onDragStart}
                    className="cursor-grab rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-semibold shadow-sm active:cursor-grabbing"
                  >
                    {room.label}
                  </button>
                ))}
                {availableRoomItems.length === 0 ? <div className="text-sm text-gray-500">{strNoUnplacedRooms}</div> : null}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-4 border-b border-gray-200 p-4">
                <span className="text-sm font-medium">{strBackgroundImage}</span>
                <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50">
                  {strChooseImage}
                  <input type="file" accept="image/*" onChange={onBackgroundChange} className="hidden" />
                </label>
              </div>
              <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4">
                <div
                  ref={mapRef}
                  onDragOver={onDragOverHandler}
                  onDrop={onDropHandler}
                  className="relative mx-auto w-full max-w-5xl overflow-hidden border border-gray-300 bg-white shadow-sm"
                >
                  {hasImage ? <img src={imageUrl} alt={house.name} className="pointer-events-none block h-auto w-full select-none" draggable={false} /> : null}
                  {!hasImage ? <div className="flex min-h-[500px] items-center justify-center text-gray-400">{strNoImage}</div> : null}
                  {placedRoomItems.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      draggable
                      onDragStart={room.onDragStart}
                      style={room.style}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-md border border-blue-300 bg-white px-2 py-1 text-sm font-bold text-blue-700 shadow-md active:cursor-grabbing"
                    >
                      {room.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}