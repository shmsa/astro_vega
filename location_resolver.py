from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

try:
    from geopy.geocoders import Nominatim
except Exception:  # optional dependency
    Nominatim = None

# Conservative Brazil fallback. Where multiple zones can occur within a state,
# the default is the zone used by the state capital / overwhelming population.
# Users can override the IANA timezone in the UI for border/exception cases.
BRAZIL_STATE_TIMEZONES = {
    "AC": "America/Rio_Branco",
    "AL": "America/Maceio",
    "AP": "America/Belem",
    "AM": "America/Manaus",
    "BA": "America/Bahia",
    "CE": "America/Fortaleza",
    "DF": "America/Sao_Paulo",
    "ES": "America/Sao_Paulo",
    "GO": "America/Sao_Paulo",
    "MA": "America/Fortaleza",
    "MT": "America/Cuiaba",
    "MS": "America/Campo_Grande",
    "MG": "America/Sao_Paulo",
    "PA": "America/Belem",
    "PB": "America/Fortaleza",
    "PR": "America/Sao_Paulo",
    "PE": "America/Recife",
    "PI": "America/Fortaleza",
    "RJ": "America/Sao_Paulo",
    "RN": "America/Fortaleza",
    "RS": "America/Sao_Paulo",
    "RO": "America/Porto_Velho",
    "RR": "America/Boa_Vista",
    "SC": "America/Sao_Paulo",
    "SP": "America/Sao_Paulo",
    "SE": "America/Maceio",
    "TO": "America/Araguaina",
}

STATE_NAME_TO_UF = {
    "acre":"AC", "alagoas":"AL", "amapa":"AP", "amazonas":"AM", "bahia":"BA",
    "ceara":"CE", "distrito federal":"DF", "espirito santo":"ES", "goias":"GO",
    "maranhao":"MA", "mato grosso":"MT", "mato grosso do sul":"MS", "minas gerais":"MG",
    "para":"PA", "paraiba":"PB", "parana":"PR", "pernambuco":"PE", "piaui":"PI",
    "rio de janeiro":"RJ", "rio grande do norte":"RN", "rio grande do sul":"RS",
    "rondonia":"RO", "roraima":"RR", "santa catarina":"SC", "sao paulo":"SP",
    "sergipe":"SE", "tocantins":"TO",
}


def _ascii_key(text: str) -> str:
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFD', text or '') if unicodedata.category(c) != 'Mn').lower().strip()


@dataclass
class ResolvedLocation:
    display_name: str
    latitude: float
    longitude: float
    timezone_name: str
    utc_offset_hours: float
    source: str
    country_code: Optional[str] = None
    state: Optional[str] = None

    def to_dict(self):
        return asdict(self)


def historical_utc_offset_hours(date: str, local_time: str, timezone_name: str) -> float:
    """Resolve the civil UTC offset valid at the birth date/time using IANA tzdata."""
    try:
        tz = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Fuso IANA desconhecido: {timezone_name}") from exc
    parts = [int(x) for x in local_time.split(':')]
    while len(parts) < 3:
        parts.append(0)
    y, m, d = [int(x) for x in date.split('-')]
    dt = datetime(y, m, d, parts[0], parts[1], parts[2], tzinfo=tz)
    off = dt.utcoffset()
    if off is None:
        raise ValueError(f"Não foi possível determinar o deslocamento UTC para {timezone_name}")
    return off.total_seconds() / 3600.0


def infer_brazil_timezone(state_or_uf: str) -> Optional[str]:
    if not state_or_uf:
        return None
    s = state_or_uf.strip().upper()
    if s in BRAZIL_STATE_TIMEZONES:
        return BRAZIL_STATE_TIMEZONES[s]
    uf = STATE_NAME_TO_UF.get(_ascii_key(state_or_uf))
    return BRAZIL_STATE_TIMEZONES.get(uf) if uf else None


def _timezonefinder_name(lat: float, lon: float) -> Optional[str]:
    """Use timezonefinder when installed; kept optional so the engine remains lightweight."""
    try:
        from timezonefinder import TimezoneFinder
    except Exception:
        return None
    tf = TimezoneFinder(in_memory=True)
    return tf.timezone_at(lat=lat, lng=lon) or tf.certain_timezone_at(lat=lat, lng=lon)


def resolve_location(
    query: str,
    date: str,
    local_time: str,
    *,
    timezone_name: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    state_or_uf: Optional[str] = None,
    country: Optional[str] = None,
    user_agent: str = "AstroVegaErwin/0.4",
) -> ResolvedLocation:
    """Resolve coordinates, IANA timezone and historical UTC offset.

    Resolution order:
      1) supplied coordinates/timezone;
      2) Nominatim geocoding (if geopy and internet are available);
      3) timezonefinder for timezone from coordinates (optional dependency);
      4) Brazil state fallback;
      5) require explicit timezone.

    This function never silently invents a UTC offset: the offset is always
    obtained from IANA tzdata for the requested historical date.
    """
    display_name = query or "Local informado manualmente"
    country_code = None
    resolved_state = state_or_uf
    source_parts = []

    lat, lon = latitude, longitude
    if lat is None or lon is None:
        if Nominatim is None:
            raise ValueError("Geocodificação indisponível. Informe latitude e longitude manualmente.")
        geocoder = Nominatim(user_agent=user_agent, timeout=8)
        try:
            loc = geocoder.geocode(query, addressdetails=True, exactly_one=True)
        except Exception as exc:
            raise ValueError("Não foi possível consultar a cidade. Verifique a internet ou informe coordenadas manualmente.") from exc
        if not loc:
            raise ValueError(f"Local não encontrado: {query}")
        lat, lon = float(loc.latitude), float(loc.longitude)
        display_name = loc.address
        raw = getattr(loc, 'raw', {}) or {}
        addr = raw.get('address', {}) or {}
        country_code = addr.get('country_code')
        resolved_state = resolved_state or addr.get('state') or addr.get('region')
        source_parts.append("Nominatim")
    else:
        lat, lon = float(lat), float(lon)
        source_parts.append("coordenadas manuais")

    tz_name = timezone_name
    if not tz_name:
        tz_name = _timezonefinder_name(lat, lon)
        if tz_name:
            source_parts.append("timezonefinder")
    if not tz_name and (country or '').strip().lower() in ('brasil','brazil','br'):
        tz_name = infer_brazil_timezone(resolved_state or '')
        if tz_name:
            source_parts.append("regra UF Brasil")
    if not tz_name and country_code == 'br':
        tz_name = infer_brazil_timezone(resolved_state or '')
        if tz_name:
            source_parts.append("regra UF Brasil")
    if not tz_name:
        raise ValueError(
            "Não foi possível determinar o fuso automaticamente. Informe um fuso IANA, por exemplo America/Belem."
        )

    offset = historical_utc_offset_hours(date, local_time, tz_name)
    source_parts.append("IANA tzdata histórico")
    return ResolvedLocation(
        display_name=display_name,
        latitude=lat,
        longitude=lon,
        timezone_name=tz_name,
        utc_offset_hours=offset,
        source=" + ".join(source_parts),
        country_code=country_code,
        state=resolved_state,
    )
