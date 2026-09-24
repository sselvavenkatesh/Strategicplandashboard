# District 360 — React Dashboard Releases

## V1.0

**Release track:** React Dashboard  
**Branch:** `react-dashboard`  
**Status:** First review release

### Release contract
- The frozen UX Review prototype is a separate track and must not be modified by React development.
- `Goal_master` is authoritative for Goals.
- `Indicator_master` is authoritative for Indicators.
- `Initiative_master` is authoritative for Initiatives.
- `Indicator_Data` supplies Indicator values only for matching master records.
- `Initiative_Data` supplies Initiative/action-item values only for matching master records.
- Missing data is rendered as empty / unavailable; UX placeholder values must never be used as fallback data.
- Dashboard data is loaded dynamically from Supabase.

### V1.0 scope
- React dashboard foundation
- Supabase connectivity
- Welcome page
- Summary page
- Goal-specific page
- Initiative detail
- Indicator detail
- Master-table enforcement
- LY variance reporting from real Indicator data
- Responsive frozen-UX styling baseline

Future React releases will be recorded here as V1.1, V1.2, V2.0, etc.
