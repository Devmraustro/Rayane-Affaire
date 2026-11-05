'use client';

import * as React from 'react';
import { CheckCircle2, Loader2, MapPin, Search, ShieldAlert } from 'lucide-react';
import type { Commune, Place, PlaceCoordinatePrecision } from '@/types';
import { useI18n } from '@/lib/i18n';
import { placesText } from '@/lib/i18n/place-copy';
import { adminFetch } from '@/lib/admin-client';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { PlaceMap } from '@/components/places/place-map';
import { toast } from 'sonner';

interface Result { id: string; label: string; lat: number; lng: number; coordinatePrecision: 'approximate'; verified: false }

export function PlaceLocationEditor({ communes, place, onPlaceChange }: {
  communes: Commune[];
  place?: Place;
  onPlaceChange: (place: Place) => void;
}) {
  const { locale } = useI18n();
  const copy = placesText(locale);
  const [communeSlug, setCommuneSlug] = React.useState(place?.commune.slug ?? communes[0]?.slug ?? '');
  const [precision, setPrecision] = React.useState<PlaceCoordinatePrecision>(place?.coordinatePrecision ?? 'pending');
  const [lat, setLat] = React.useState(place?.coordinates?.lat.toString() ?? '');
  const [lng, setLng] = React.useState(place?.coordinates?.lng.toString() ?? '');
  const [locationStatus, setLocationStatus] = React.useState(place?.locationStatus ?? 'missing');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Result[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);
  const commune = communes.find((item) => item.slug === communeSlug) ?? communes[0];
  const latNumber = Number(lat);
  const lngNumber = Number(lng);
  const valid = lat.trim() !== '' && lng.trim() !== '' && Number.isFinite(latNumber) && Number.isFinite(lngNumber) && latNumber >= -90 && latNumber <= 90 && lngNumber >= -180 && lngNumber <= 180;
  const point = valid && precision !== 'pending' ? { lat: latNumber, lng: lngNumber } : null;
  const initialLat = place?.coordinates?.lat.toString() ?? '';
  const initialLng = place?.coordinates?.lng.toString() ?? '';
  const dirty = lat !== initialLat || lng !== initialLng || precision !== (place?.coordinatePrecision ?? 'pending') || communeSlug !== (place?.commune.slug ?? communes[0]?.slug ?? '');

  const markManual = (next: { lat: number; lng: number }) => {
    setLat(next.lat.toFixed(6)); setLng(next.lng.toFixed(6));
    if (precision === 'pending') setPrecision('approximate');
    setLocationStatus('unverified');
  };
  const changePrecision = (next: PlaceCoordinatePrecision) => {
    setPrecision(next);
    if (next === 'pending') { setLat(''); setLng(''); setLocationStatus('missing'); }
    else if (valid) setLocationStatus('unverified');
  };
  const search = async () => {
    setSearching(true); setSearched(true); setSearchError(''); setResults([]);
    try {
      const response = await fetch(`/api/admin/geocode?q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
      const body = await response.json() as { ok: boolean; data?: { results: Result[] }; error?: { code?: string } };
      if (!response.ok || !body.ok) {
        setSearchError(body.error?.code === 'GEOCODER_RATE_LIMITED' || body.error?.code === 'RATE_LIMITED' ? copy.geocodeRateLimited : copy.geocodeError);
      } else setResults(body.data?.results ?? []);
    } catch { setSearchError(copy.geocodeError); }
    finally { setSearching(false); }
  };
  const verify = async () => {
    if (!place || dirty || !valid) return;
    setVerifying(true);
    const result = await adminFetch<Place>(`/api/admin/places/${place.id}/verify`, { method: 'POST', body: { verified: locationStatus !== 'verified' } });
    setVerifying(false);
    if (!result.ok || !result.data) { toast.error(result.error?.code === 'COORDINATES_REQUIRED' ? copy.invalidCoordinates : copy.geocodeError); return; }
    setLocationStatus(result.data.locationStatus); onPlaceChange(result.data); toast.success(copy.saved);
  };

  return <div className="space-y-4">
    <div className={`rounded-xl border px-4 py-3 text-xs ${locationStatus === 'verified' ? 'border-success/30 bg-success-soft text-success' : 'border-warning/30 bg-warning-soft text-warning'}`}>
      <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4" />{locationStatus === 'verified' ? copy.locationVerified : locationStatus === 'unverified' ? copy.locationUnverified : copy.locationMissing}</p>
      <p className="mt-1 leading-5">{copy.verificationHelp}</p>
      {place?.verifiedAt && locationStatus === 'verified' && <p className="mt-1">{copy.verifiedAt} {new Date(place.verifiedAt).toLocaleString(locale === 'ar' ? 'ar-DZ' : 'fr-DZ')}</p>}
    </div>

    <div className="rounded-xl border border-sand-200 bg-sand-50 p-4">
      <Field label={copy.addressSearch} htmlFor="geocode-query">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="geocode-query" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (query.trim().length >= 2) void search(); } }} placeholder={copy.addressSearchPlaceholder} maxLength={200} />
          <Button type="button" onClick={() => void search()} variant="outline" disabled={searching || query.trim().length < 2}>{searching ? <Loader2 className="animate-spin" /> : <Search />}{searching ? copy.searching : copy.searchAction}</Button>
        </div>
      </Field>
      <p className="mt-2 text-2xs leading-4 text-ink-500">{copy.searchHelp}</p>
      {searchError && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{searchError}</p>}
      {!searching && searched && !searchError && results.length === 0 && <p role="status" className="mt-3 text-xs text-ink-500">{copy.noGeocodeResults}</p>}
      {results.length > 0 && <ul className="mt-3 space-y-2" aria-label={copy.addressSearch}>{results.map((result) => <li key={result.id}>
        <button type="button" data-testid="geocode-result" onClick={() => { setLat(result.lat.toFixed(6)); setLng(result.lng.toFixed(6)); setPrecision('approximate'); setLocationStatus('unverified'); setResults([]); setSearched(false); }} className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-start text-xs text-ink-700 hover:border-gold-400">
          <span className="block font-medium">{result.label}</span><span className="mt-1 block text-2xs text-warning">{copy.chooseResult} · {result.lat.toFixed(6)}, {result.lng.toFixed(6)}</span>
        </button>
      </li>)}</ul>}
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label={copy.commune} htmlFor="communeSlug"><Select id="communeSlug" name="communeSlug" value={communeSlug} onChange={(event) => setCommuneSlug(event.target.value)}>{communes.map((item) => <option key={item.id} value={item.slug}>{item.name[locale]} — {item.wilaya[locale]}</option>)}</Select></Field>
      <Field label={copy.precision} htmlFor="coordinatePrecision"><Select id="coordinatePrecision" name="coordinatePrecision" value={precision} onChange={(event) => changePrecision(event.target.value as PlaceCoordinatePrecision)}><option value="pending">{copy.pending}</option><option value="approximate">{copy.approximate}</option><option value="exact">{copy.exact}</option></Select></Field>
      <Field label={copy.latitude} htmlFor="lat" error={lat && !valid ? copy.invalidCoordinates : undefined}><Input id="lat" name="lat" dir="ltr" type="number" step="any" min={-90} max={90} value={lat} disabled={precision === 'pending'} onChange={(event) => { setLat(event.target.value); setLocationStatus('unverified'); }} /></Field>
      <Field label={copy.longitude} htmlFor="lng" error={lng && !valid ? copy.invalidCoordinates : undefined}><Input id="lng" name="lng" dir="ltr" type="number" step="any" min={-180} max={180} value={lng} disabled={precision === 'pending'} onChange={(event) => { setLng(event.target.value); setLocationStatus('unverified'); }} /></Field>
    </div>
    <input type="hidden" name="locationStatusIgnored" value={locationStatus} readOnly />
    <p className="text-2xs leading-4 text-ink-500">{copy.mapHelp}</p>
    {commune && <PlaceMap point={point} center={commune.center} precision={precision} editable onChange={markManual} label={copy.location} />}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => { setLat(''); setLng(''); setPrecision('pending'); setLocationStatus('missing'); }}><MapPin />{copy.clearLocation}</Button>
      {place && <Button type="button" variant={locationStatus === 'verified' ? 'outline' : 'gold'} size="sm" disabled={!valid || dirty || verifying} onClick={verify} title={dirty ? copy.save : undefined}>{verifying ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{verifying ? copy.verifying : locationStatus === 'verified' ? copy.unverify : copy.verify}</Button>}
    </div>
    {place && dirty && <p className="text-xs text-warning">{copy.save} — {copy.verificationHelp}</p>}
  </div>;
}
