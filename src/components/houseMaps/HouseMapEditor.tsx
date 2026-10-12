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

export default function HouseMapEditor(props: HouseMapEditorProps) {
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
  const [backgroundUrl, setBackgroundUrl] = useState(props.houseMap?.bg_image_url ?? "");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [draggedRoomId, setDraggedRoomId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = props.houseMap !== null;
  const formTitle = isEditMode ? strEditTitle : strCreateTitle;
  const imageUrl = previewUrl || backgroundUrl;
  const hasImage = imageUrl !== "";

  const loadRooms = async () => {
    setIsLoading(true);
    setIsLoadError(false);

    try {
      const allRooms = await roomsService.getRooms();
      const availableRooms = houseMapsService.getRoomsForHouseMap(
        props.house,
        props.houses,
        allRooms
      );

      setRooms(availableRooms);
      setRoomPositions(houseMapsService.getRoomPositions(props.houseMap));
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
          props.house.id,
          backgroundFile
        );
      }

      if (props.houseMap) {
        await houseMapsService.updateHouseMap(
          props.houseMap.id,
          savedBackgroundUrl || null,
          roomPositions
        );
      } else {
        await houseMapsService.createHouseMap(
          props.house.id,
          savedBackgroundUrl || null,
          roomPositions
        );
      }

      await props.onSaveActionClick();
    } finally {
      setIsSaving(false);
    }
  };

  const availableRooms = houseMapsService.getUnplacedRooms(
    rooms,
    roomPositions
  );

  const availableRoomItems = availableRooms.map(room => {
    const label = houseMapsService.getRoomLabel(room, props.house, props.houses);

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
    .map(position => {
      const room = rooms.find(item => item.id === position.room_id);

      if (!room) {
        return null;
      }

      const label = houseMapsService.getRoomLabel(room, props.house, props.houses);

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
    .filter(item => item !== null);

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
    <div className="project-map-editor-backdrop">
      <div className="project-map-editor-modal">
        <header className="project-map-editor-header">
          <div><span>{strRooms}</span><h2>{formTitle}: {props.house.name}</h2></div>
          <div className="project-form-footer-actions"><button type="button" onClick={props.onCancelActionClick} className="project-action-button project-action-button-secondary">{strCancel}</button><button type="button" onClick={onSaveHandler} disabled={isSaving} className="project-action-button project-action-button-primary">{strSave}</button></div>
        </header>
        {isLoading && <div className="project-state-message project-map-editor-message">{strLoading}</div>}
        {isLoadError && <div className="project-state-message project-state-error project-map-editor-message">{strLoadError}</div>}
        {!isLoading && !isLoadError && (
          <div className="project-map-editor-body">
            <aside className="project-map-editor-sidebar">
              <h3>{strRooms}</h3>
              <div className="project-map-room-list">
                {availableRoomItems.map(room => <button key={room.id} type="button" draggable onDragStart={room.onDragStart} className="project-map-room-chip">{room.label}</button>)}
                {availableRoomItems.length === 0 && <div className="project-map-room-empty">{strNoUnplacedRooms}</div>}
              </div>
            </aside>
            <div className="project-map-editor-workspace">
              <div className="project-map-editor-toolbar">
                <span>{strBackgroundImage}</span>
                <label className="project-inline-button project-file-button">{strChooseImage}<input type="file" accept="image/*" onChange={onBackgroundChange} className="sr-only" /></label>
              </div>
              <div className="project-map-canvas-wrap">
                <div ref={mapRef} onDragOver={onDragOverHandler} onDrop={onDropHandler} className="project-map-canvas">
                  {hasImage && <img src={imageUrl} alt={props.house.name} className="project-map-background" draggable={false} />}
                  {!hasImage && <div className="project-map-no-image">{strNoImage}</div>}
                  {placedRoomItems.map(room => <button key={room.id} type="button" draggable onDragStart={room.onDragStart} style={room.style} className="project-map-room-marker">{room.label}</button>)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
