'use client';

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Guest, TaxiGuest, TaxiRide } from "@/services/database";
import dateService from "@/services/dateService";
import roomsService from "@/services/roomsService";
import ImportRides from "@/components/taxis/ImportRides";
import { useRetreat } from "@/contexts/RetreatContext";

type TaxiRidesPanelProps = {
  canManage: boolean;
  canImport?: boolean;
  showTitle?: boolean;
};

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
};

export default function TaxiRidesPanel({ canManage, canImport = false, showTitle = true }: TaxiRidesPanelProps) {
  const strTitle = "Taxi rides";
  const strLoading = "Loading...";
  const strNoRides = "No taxi rides yet.";
  const strUnknown = "-";
  const strAddRide = "Add ride";
  const strImportRides = "Import rides";
  const strEditRide = "Edit";
  const strArrival = "Arrival date and time";
  const strDriverName = "Driver name";
  const strSaveRide = "Save ride";
  const strCreateRide = "Create ride";
  const strDeleteRide = "Delete";
  const strCancel = "Cancel";
  const strRideNumber = "Taxi";
  const strPassengers = "Passengers";
  const strHouses = "Houses";
  const strNoAssignedHouses = "No assigned houses";
  const strGuest = "Guest";
  const strName = "Name";
  const strRoom = "Room";
  const strRemove = "Remove";
  const strSearchGuests = "Search guests";
  const strNoMatchingGuests = "No matching guests.";
  const strNoPassengers = "No passengers assigned.";
  const strAdditionalPassenger = "Or additional passenger";
  const strAddPassenger = "Add passenger";
  const strSelectRide = "Select a taxi to view its passengers.";
  const strPassengerCount = "guests";
  const strMoveGuestConfirm = "Move this guest from the other taxi to the selected taxi?";
  const strSaveError = "Failed to save taxi ride.";
  const strDeleteConfirm = "Delete this taxi ride?";
  const strDeleteError = "Failed to delete taxi ride.";
  const strAddPassengerError = "Enter an additional passenger name.";
  const strSavePassengerError = "Failed to add taxi passenger.";
  const strRemovePassengerError = "Failed to remove taxi passenger.";
  const strArrivalRequired = "Choose the arrival date and time.";
  const {
    snapshot,
    isLoading,
    error: retreatError,
    createTaxiRide,
    updateTaxiRide,
    deleteTaxiRide,
    addTaxiGuest,
    moveTaxiGuest,
    deleteTaxiGuest,
  } = useRetreat();
  const rides: TaxiRide[] = [...(snapshot?.taxiRides ?? [])].sort((left, right) => {
    const timeDifference = Date.parse(left.arrival_datetime) - Date.parse(right.arrival_datetime);

    return timeDifference || left.id - right.id;
  });
  const guests = snapshot?.guests ?? [];
  const houses = snapshot?.houses ?? [];
  const rooms = snapshot?.rooms ?? [];
  const taxiGuests = snapshot?.taxiGuests ?? [];
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const selectedRide = rides.find((ride) => ride.id === selectedRideId)
    ?? (selectedRideId === null ? rides[0] ?? null : null);
  const isSnapshotLoading = isLoading || !snapshot;
  const [rideBeingEdited, setRideBeingEdited] = useState<TaxiRide | null>(null);
  const [arrivalDateTime, setArrivalDateTime] = useState("");
  const [driverName, setDriverName] = useState("");
  const [guestSearch, setGuestSearch] = useState("");
  const [extraPassengerName, setExtraPassengerName] = useState("");
  const [isRideModalOpen, setIsRideModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [error, setError] = useState("");

  const onArrivalChange = (event: ChangeEvent<HTMLInputElement>) => {
    setArrivalDateTime(event.target.value);
  };

  const onDriverNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDriverName(event.target.value);
  };

  const onGuestSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setGuestSearch(event.target.value);
  };

  const onExtraPassengerNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setExtraPassengerName(event.target.value);
  };

  const onRideSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!arrivalDateTime) {
      setError(strArrivalRequired);
      return;
    }

    setError("");

    try {
      const ride = rideBeingEdited
        ? await updateTaxiRide(rideBeingEdited.id, {
            arrival_datetime: new Date(arrivalDateTime).toISOString(),
            driver_name: driverName.trim() || null,
          })
        : await createTaxiRide({
            arrival_datetime: new Date(arrivalDateTime).toISOString(),
            driver_name: driverName.trim() || null,
          });

      setSelectedRideId(ride.id);
      setRideBeingEdited(null);
      setIsRideModalOpen(false);
    } catch {
      setError(strSaveError);
    }
  };

  const onNewRideClick = () => {
    setRideBeingEdited(null);
    setArrivalDateTime("");
    setDriverName("");
    setError("");
    setIsRideModalOpen(true);
  };

  const onImportRidesClick = () => {
    setError("");
    setIsImportOpen(true);
  };

  const onImportCloseActionClick = () => {
    setIsImportOpen(false);
  };

  const onEditRideClick = (ride: TaxiRide) => {
    setSelectedRideId(ride.id);
    setRideBeingEdited(ride);
    setArrivalDateTime(toLocalDateTimeInput(ride.arrival_datetime));
    setDriverName(ride.driver_name ?? "");
    setError("");
    setIsRideModalOpen(true);
  };

  const onRideSelect = (ride: TaxiRide) => {
    setSelectedRideId(ride.id);
    setGuestSearch("");
  };

  const onDeleteRideClick = async () => {
    if (!rideBeingEdited || !window.confirm(strDeleteConfirm)) {
      return;
    }

    setError("");

    try {
      await deleteTaxiRide(rideBeingEdited.id);
      setSelectedRideId((current) => current === rideBeingEdited.id ? null : current);
      setRideBeingEdited(null);
      setIsRideModalOpen(false);
      setArrivalDateTime("");
      setDriverName("");
    } catch {
      setError(strDeleteError);
    }
  };

  const onPassengerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRide) {
      return;
    }

    const name = extraPassengerName.trim();

    if (!name) {
      setError(strAddPassengerError);
      return;
    }

    setError("");

    try {
      await addTaxiGuest({
        ride_id: selectedRide.id,
        guest_id: null,
        unbooked_guest_name: name,
      });
      setExtraPassengerName("");
    } catch {
      setError(strSavePassengerError);
    }
  };

  const onGuestSelect = async (guest: Guest) => {
    if (!selectedRide) {
      return;
    }

    const existingAssignment = taxiGuests.find((passenger) => passenger.guest_id === guest.id);

    if (existingAssignment) {
      const assignedRide = rides.find((ride) => ride.id === existingAssignment.ride_id);
      const assignedRideNumber = rides.findIndex((ride) => ride.id === assignedRide?.id) + 1;

      if (!window.confirm(strMoveGuestConfirm.replace("other taxi", `${strRideNumber} ${assignedRideNumber}`))) {
        return;
      }

      try {
        await moveTaxiGuest(existingAssignment.id, selectedRide.id);
      } catch {
        setError(strSavePassengerError);
        return;
      }
    } else {
      try {
        await addTaxiGuest({
          ride_id: selectedRide.id,
          guest_id: guest.id,
          unbooked_guest_name: null,
        });
      } catch {
        setError(strSavePassengerError);
        return;
      }
    }

    setError("");
    setGuestSearch("");
  };

  const onPassengerDeleteClick = async (passenger: TaxiGuest) => {
    setError("");

    try {
      await deleteTaxiGuest(passenger.id);
    } catch {
      setError(strRemovePassengerError);
    }
  };

  const rideRows = rides.map((ride, index) => {
    const assignedPassengers = taxiGuests.filter((passenger) => passenger.ride_id === ride.id);
    const passengerCount = assignedPassengers.length;
    const assignedHouseIds = Array.from(new Set(assignedPassengers.flatMap((passenger) => {
      if (passenger.guest_id === null) {
        return [];
      }

      const guest = guests.find((item) => item.id === passenger.guest_id);
      const room = rooms.find((item) => item.id === guest?.room_id);
      const house = houses.find((item) => item.id === room?.house_id);

      return house ? [house.id] : [];
    }))).sort((left, right) => left - right);
    const assignedHouseNames = assignedHouseIds.flatMap((houseId) => {
      const house = houses.find((item) => item.id === houseId);

      return house ? [house.name] : [];
    });
    const arrivalDate = new Date(ride.arrival_datetime);
    const arrivalTime = arrivalDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    return {
      id: ride.id,
      number: `${strRideNumber} ${index + 1}`,
      arrivalTime,
      arrivalDate: dateService.formatDate(ride.arrival_datetime),
      driverName: ride.driver_name,
      passengerCount: `${passengerCount} ${strPassengerCount}`,
      houseNames: assignedHouseNames,
      isSelected: selectedRide?.id === ride.id,
      onSelect: () => onRideSelect(ride),
      onEdit: () => onEditRideClick(ride),
    };
  });
  const selectedRideRow = rideRows.find((ride) => ride.id === selectedRide?.id) ?? null;
  const selectedTaxiGuests = selectedRide
    ? taxiGuests.filter((passenger) => passenger.ride_id === selectedRide.id)
    : [];
  const passengerRows = selectedTaxiGuests.map((passenger) => {
    const matchedGuest = guests.find((guest) => guest.id === passenger.guest_id);
    const name = matchedGuest?.name ?? passenger.unbooked_guest_name ?? strGuest;
    const room = matchedGuest?.room_id
      ? rooms.find((item) => item.id === matchedGuest.room_id)
      : undefined;
    const house = room ? houses.find((item) => item.id === room.house_id) : undefined;
    const roomName = room && house
      ? roomsService.getRoomDisplayName(room, house)
      : strUnknown;
    const houseId = house?.id ?? Number.MAX_SAFE_INTEGER;
    const onRemoveClick = () => {
      void onPassengerDeleteClick(passenger);
    };

    return {
      id: passenger.id,
      name,
      roomName,
      houseId,
      onRemoveClick,
    };
  }).sort((left, right) => left.houseId - right.houseId
    || left.roomName.localeCompare(right.roomName)
    || left.name.localeCompare(right.name));
  const selectedGuestIds = selectedTaxiGuests.flatMap((passenger) =>
    passenger.guest_id === null ? [] : [passenger.guest_id]
  );
  const normalizedGuestSearch = guestSearch.trim().toLocaleLowerCase();
  const availableGuestRows = guests
    .filter((guest) => !selectedGuestIds.includes(guest.id))
    .filter((guest) => guest.name.toLocaleLowerCase().includes(normalizedGuestSearch))
    .map((guest) => {
      const assignment = taxiGuests.find((passenger) => passenger.guest_id === guest.id);
      const assignedRideIndex = assignment
        ? rides.findIndex((ride) => ride.id === assignment.ride_id)
        : -1;

      return {
        id: guest.id,
        name: guest.name,
        assignmentLabel: assignedRideIndex >= 0
          ? `(${strRideNumber} ${assignedRideIndex + 1})`
          : "",
        onSelect: () => void onGuestSelect(guest),
      };
    });
  const rideSubmitLabel = rideBeingEdited ? strSaveRide : strCreateRide;
  const hasNoRides = rides.length === 0;
  const hasPassengerRows = passengerRows.length > 0;
  const hasAvailableGuestRows = availableGuestRows.length > 0;

  return (
    <section className="ozen-taxi-screen">
      {showTitle ? <div className="ozen-section-toolbar"><div><h2>{strTitle}</h2></div></div> : null}
      {error ? <p role="alert" className="ozen-state-message ozen-state-error">{error}</p> : null}
      {retreatError ? <p role="alert" className="ozen-state-message ozen-state-error">{retreatError}</p> : null}
      {isSnapshotLoading ? <p className="ozen-state-message">{strLoading}</p> : null}
      {!isSnapshotLoading ? (
        <>
          {canImport ? (
            <div className="ozen-taxi-import-toolbar">
              <button type="button" onClick={onImportRidesClick} className="ozen-action-button ozen-action-button-secondary">{strImportRides}</button>
            </div>
          ) : null}
          <div className="ozen-taxi-grid">
            {rideRows.map((ride) => (
              <article key={ride.id} className={ride.isSelected ? "ozen-taxi-card ozen-taxi-card-selected" : "ozen-taxi-card"}>
                <button type="button" onClick={ride.onSelect} aria-pressed={ride.isSelected} className="ozen-taxi-card-main">
                  <span className="ozen-taxi-number">{ride.number}</span>
                  <strong>{ride.arrivalTime}</strong>
                  <span className="ozen-taxi-date">{ride.arrivalDate}</span>
                  {ride.driverName ? <span className="ozen-taxi-driver">{ride.driverName}</span> : null}
                  <span className="ozen-taxi-passenger-count">{ride.passengerCount}</span>
                </button>
                {canManage ? <button type="button" onClick={ride.onEdit} className="ozen-taxi-edit">{strEditRide}</button> : null}
              </article>
            ))}
            {canManage ? (
              <button type="button" onClick={onNewRideClick} className="ozen-taxi-add-card">
                <span className="ozen-taxi-add-icon">+</span>
                <span>{strAddRide}</span>
              </button>
            ) : null}
          </div>
          {selectedRideRow ? (
            <div className="ozen-taxi-house-summary">
              <span>{strHouses}</span>
              <strong>{selectedRideRow.houseNames.length > 0 ? selectedRideRow.houseNames.join(", ") : strNoAssignedHouses}</strong>
            </div>
          ) : null}
          {hasNoRides ? <p className="ozen-empty-message">{strNoRides}</p> : null}
          {selectedRide ? (
            <section className="ozen-taxi-detail">
              <div className="ozen-panel-heading-row">
                <h3>{strPassengers}</h3>
              </div>
              <div className="ozen-taxi-detail-grid">
                <div className="ozen-table-panel">
                  <table className="ozen-data-table ozen-passenger-table">
                    <thead>
                      <tr>
                        <th>{strName}</th>
                        <th>{strRoom}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengerRows.map((passenger) => (
                        <tr key={passenger.id}>
                          <td>
                            <div className="ozen-passenger-name">
                              {canManage ? (
                                <button type="button" onClick={passenger.onRemoveClick} aria-label={`${strRemove} ${passenger.name}`} title={strRemove} className="ozen-remove-passenger">×</button>
                              ) : null}
                              <span>{passenger.name}</span>
                            </div>
                          </td>
                          <td className="ozen-passenger-room" title={passenger.roomName}>{passenger.roomName.slice(0, 8)}</td>
                        </tr>
                      ))}
                      {!hasPassengerRows ? <tr><td colSpan={2} className="ozen-table-empty">{strNoPassengers}</td></tr> : null}
                    </tbody>
                  </table>
                </div>
                {canManage ? (
                  <div className="ozen-taxi-passenger-editor">
                    <label className="ozen-form-field">
                      <span>{strSearchGuests}</span>
                      <input type="search" value={guestSearch} onChange={onGuestSearchChange} />
                    </label>
                    <div className="ozen-taxi-guest-results">
                      {availableGuestRows.map((guest) => (
                        <button key={guest.id} type="button" onClick={guest.onSelect} className="ozen-taxi-guest-result">
                          <span>{guest.name}</span>
                          {guest.assignmentLabel ? <small>{guest.assignmentLabel}</small> : null}
                        </button>
                      ))}
                      {!hasAvailableGuestRows ? <p>{strNoMatchingGuests}</p> : null}
                    </div>
                    <form onSubmit={onPassengerSubmit} className="ozen-add-passenger-form">
                      <label className="ozen-form-field">
                        <span>{strAdditionalPassenger}</span>
                        <input value={extraPassengerName} onChange={onExtraPassengerNameChange} />
                      </label>
                      <button type="submit" className="ozen-secondary-button">{strAddPassenger}</button>
                    </form>
                  </div>
                ) : null}
              </div>
            </section>
          ) : !hasNoRides ? <p className="ozen-empty-message">{strSelectRide}</p> : null}
        </>
      ) : null}
      {isImportOpen && canImport ? <ImportRides onCloseActionClick={onImportCloseActionClick} /> : null}
      {isRideModalOpen && canManage ? (
        <div className="ozen-modal-backdrop">
          <div role="dialog" aria-modal="true" aria-labelledby="taxi-ride-dialog-title" className="ozen-form-modal">
            <div className="ozen-form-modal-header">
              <h3 id="taxi-ride-dialog-title">{rideSubmitLabel}</h3>
            </div>
            <form onSubmit={onRideSubmit} className="ozen-form-body">
              <label className="ozen-form-field">
                <span>{strArrival}</span>
                <input type="datetime-local" value={arrivalDateTime} onChange={onArrivalChange} required />
              </label>
              <label className="ozen-form-field">
                <span>{strDriverName}</span>
                <input value={driverName} onChange={onDriverNameChange} />
              </label>
              <div className="ozen-form-footer ozen-form-footer-split">
                <div>
                  {rideBeingEdited ? <button type="button" onClick={onDeleteRideClick} className="ozen-action-button ozen-action-button-danger">{strDeleteRide}</button> : null}
                </div>
                <div className="ozen-form-footer-actions">
                  <button type="button" onClick={() => setIsRideModalOpen(false)} className="ozen-action-button ozen-action-button-secondary">{strCancel}</button>
                  <button type="submit" className="ozen-action-button ozen-action-button-primary">{rideSubmitLabel}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
