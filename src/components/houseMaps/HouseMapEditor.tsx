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
    <div className="ozen-map-editor-backdrop">
      <div className="ozen-map-editor-modal">
        <header className="ozen-map-editor-header">
          <div><span>{strRooms}</span><h2>{formTitle}: {house.name}</h2></div>
          <div className="ozen-form-footer-actions"><button type="button" onClick={onCancelActionClick} className="ozen-action-button ozen-action-button-secondary">{strCancel}</button><button type="button" onClick={onSaveHandler} disabled={isSaving} className="ozen-action-button ozen-action-button-primary">{strSave}</button></div>
        </header>
        {isLoading ? <div className="ozen-state-message ozen-map-editor-message">{strLoading}</div> : null}
        {isLoadError ? <div className="ozen-state-message ozen-state-error ozen-map-editor-message">{strLoadError}</div> : null}
        {!isLoading && !isLoadError ? (
          <div className="ozen-map-editor-body">
            <aside className="ozen-map-editor-sidebar">
              <h3>{strRooms}</h3>
              <div className="ozen-map-room-list">
                {availableRoomItems.map((room) => <button key={room.id} type="button" draggable onDragStart={room.onDragStart} className="ozen-map-room-chip">{room.label}</button>)}
                {availableRoomItems.length === 0 ? <div className="ozen-map-room-empty">{strNoUnplacedRooms}</div> : null}
              </div>
            </aside>
            <div className="ozen-map-editor-workspace">
              <div className="ozen-map-editor-toolbar">
                <span>{strBackgroundImage}</span>
                <label className="ozen-inline-button ozen-file-button">{strChooseImage}<input type="file" accept="image/*" onChange={onBackgroundChange} className="sr-only" /></label>
              </div>
              <div className="ozen-map-canvas-wrap">
                <div ref={mapRef} onDragOver={onDragOverHandler} onDrop={onDropHandler} className="ozen-map-canvas">
                  {hasImage ? <img src={imageUrl} alt={house.name} className="ozen-map-background" draggable={false} /> : null}
                  {!hasImage ? <div className="ozen-map-no-image">{strNoImage}</div> : null}
                  {placedRoomItems.map((room) => <button key={room.id} type="button" draggable onDragStart={room.onDragStart} style={room.style} className="ozen-map-room-marker">{room.label}</button>)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
