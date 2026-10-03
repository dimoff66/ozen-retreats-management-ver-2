'use client';

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Guest, TaxiGuest, TaxiRide } from "@/services/database";
import guestsService from "@/services/guestsService";
import taxiRidesService from "@/services/taxiRidesService";

type TaxiRidesPanelProps = {
  retreatId: number;
  canManage: boolean;
};

const toLocalDateTimeInput = (value: string): string => {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
};

export default function TaxiRidesPanel({ retreatId, canManage }: TaxiRidesPanelProps) {
  const [rides, setRides] = useState<TaxiRide[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [passengers, setPassengers] = useState<TaxiGuest[]>([]);
  const [selectedRide, setSelectedRide] = useState<TaxiRide | null>(null);
  const [arrivalDateTime, setArrivalDateTime] = useState("");
  const [passengerChoice, setPassengerChoice] = useState("");
  const [extraPassengerName, setExtraPassengerName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRides = async () => {
    try {
      const [rideData, guestData] = await Promise.all([
        taxiRidesService.getByRetreatId(retreatId),
        guestsService.getGuestsByRetreatId(retreatId),
      ]);

      setRides(rideData);
      setGuests(guestData);
      const nextRide = rideData.find((ride) => ride.id === selectedRide?.id) ?? null;
      setSelectedRide(nextRide);
      if (!nextRide) {
        setPassengers([]);
        setArrivalDateTime("");
      }
      setError("");
    } catch {
      setError("Failed to load taxi rides.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPassengers = async (ride: TaxiRide) => {
    try {
      const ridePassengers = await taxiRidesService.getGuestsByRideId(ride.id);
      setSelectedRide(ride);
      setArrivalDateTime(toLocalDateTimeInput(ride.arrival_datetime));
      setPassengers(ridePassengers);
      setError("");
    } catch {
      setPassengers([]);
      setError("Failed to load taxi passengers.");
    }
  };

  const onArrivalChange = (event: ChangeEvent<HTMLInputElement>) => {
    setArrivalDateTime(event.target.value);
  };

  const onPassengerChoiceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPassengerChoice(event.target.value);
  };

  const onExtraPassengerNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setExtraPassengerName(event.target.value);
  };

  const onRideSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!arrivalDateTime) {
      setError("Choose the arrival date and time.");
      return;
    }

    setError("");

    try {
      const ride = selectedRide
        ? await taxiRidesService.update(selectedRide.id, {
            arrival_datetime: new Date(arrivalDateTime).toISOString(),
          })
        : await taxiRidesService.create({
            retreat_id: retreatId,
            arrival_datetime: new Date(arrivalDateTime).toISOString(),
          });

      await loadRides();
      await loadPassengers(ride);
    } catch {
      setError("Failed to save taxi ride.");
    }
  };

  const onNewRideClick = () => {
    setSelectedRide(null);
    setPassengers([]);
    setArrivalDateTime("");
    setError("");
  };

  const onDeleteRideClick = async () => {
    if (!selectedRide || !window.confirm("Delete this taxi ride?")) {
      return;
    }

    setError("");

    try {
      await taxiRidesService.delete(selectedRide.id);
      setSelectedRide(null);
      setPassengers([]);
      setArrivalDateTime("");
      await loadRides();
    } catch {
      setError("Failed to delete taxi ride.");
    }
  };

  const onPassengerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRide) {
      return;
    }

    const guestId = Number(passengerChoice);
    const guest = guests.find((item) => item.id === guestId);
    const name = extraPassengerName.trim();

    if (!guest && !name) {
      setError("Choose a guest or enter an additional passenger name.");
      return;
    }

    setError("");

    try {
      await taxiRidesService.addGuest({
        ride_id: selectedRide.id,
        guest_id: guest?.id ?? null,
        unbooked_guest_name: guest ? null : name,
      });
      setPassengerChoice("");
      setExtraPassengerName("");
      await loadPassengers(selectedRide);
    } catch {
      setError("Failed to add taxi passenger.");
    }
  };

  const onPassengerDeleteClick = async (passenger: TaxiGuest) => {
    setError("");

    try {
      await taxiRidesService.deleteGuest(passenger.id);
      if (selectedRide) {
        await loadPassengers(selectedRide);
      }
    } catch {
      setError("Failed to remove taxi passenger.");
    }
  };

  useEffect(() => {
    let isCancelled = false;

    void Promise.all([
      taxiRidesService.getByRetreatId(retreatId),
      guestsService.getGuestsByRetreatId(retreatId),
    ])
      .then(([rideData, guestData]) => {
        if (isCancelled) {
          return;
        }

        setRides(rideData);
        setGuests(guestData);
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Failed to load taxi rides.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [retreatId]);

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">Taxi rides</h2>
      {error ? <p role="alert" className="mb-4 text-red-600">{error}</p> : null}
      {isLoading ? <p>Loading...</p> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
          <div className="space-y-3">
            {rides.map((ride) => (
              <button
                key={ride.id}
                type="button"
                onClick={() => loadPassengers(ride)}
                className={`block w-full rounded-lg border p-4 text-left ${selectedRide?.id === ride.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
              >
                {new Date(ride.arrival_datetime).toLocaleString()}
                <span className="ml-2 text-sm text-gray-500">
                  {selectedRide?.id === ride.id ? `${passengers.length} passengers` : ""}
                </span>
              </button>
            ))}
            {rides.length === 0 ? <p className="text-gray-600">No taxi rides yet.</p> : null}
            {canManage ? (
              <button
                type="button"
                onClick={onNewRideClick}
                className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Add taxi ride
              </button>
            ) : null}
          </div>
          {selectedRide || canManage ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              {canManage ? (
                <form onSubmit={onRideSubmit} className="mb-5 flex flex-wrap items-end gap-2">
                  <label className="flex-1 text-sm font-medium">
                    Arrival date and time
                    <input
                      type="datetime-local"
                      value={arrivalDateTime}
                      onChange={onArrivalChange}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                    {selectedRide ? "Save ride" : "Create ride"}
                  </button>
                  {selectedRide ? (
                    <button type="button" onClick={onDeleteRideClick} className="rounded-md border border-red-200 px-4 py-2 font-semibold text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  ) : null}
                </form>
              ) : null}
              {selectedRide ? (
                <>
                  <h3 className="mb-3 font-semibold">Passengers</h3>
                  {passengers.map((passenger) => {
                    const passengerName = passenger.guest_id
                      ? guests.find((guest) => guest.id === passenger.guest_id)?.name ?? "Guest"
                      : passenger.unbooked_guest_name ?? "Guest";

                    return (
                      <div key={passenger.id} className="flex items-center justify-between border-t border-gray-100 py-2">
                        <span>{passengerName}</span>
                        {canManage ? (
                          <button type="button" onClick={() => onPassengerDeleteClick(passenger)} className="text-sm text-red-600 hover:underline">
                            Remove
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  {canManage ? (
                    <form onSubmit={onPassengerSubmit} className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                      <label className="block text-sm font-medium">
                        Existing guest
                        <select value={passengerChoice} onChange={onPassengerChoiceChange} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
                          <option value="">Select a guest</option>
                          {guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.name}</option>)}
                        </select>
                      </label>
                      <label className="block text-sm font-medium">
                        Or additional passenger
                        <input value={extraPassengerName} onChange={onExtraPassengerNameChange} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
                      </label>
                      <button type="submit" className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-100">
                        Add passenger
                      </button>
                    </form>
                  ) : null}
                </>
              ) : <p className="text-gray-600">Select a ride to view its passengers.</p>}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
