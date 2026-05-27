"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
var react_1 = require("react");
var MatchCard_1 = require("./components/MatchCard");
var MatchDetail_1 = require("./components/MatchDetail");
var FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Live', value: 'live' },
    { label: 'Upcoming', value: 'scheduled' },
    { label: 'Finished', value: 'finished' },
];
function App() {
    var _a = (0, react_1.useState)([]), matches = _a[0], setMatches = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)('all'), filter = _c[0], setFilter = _c[1];
    var _d = (0, react_1.useState)(null), selected = _d[0], setSelected = _d[1];
    (0, react_1.useEffect)(function () {
        setLoading(true);
        var params = filter !== 'all' ? "?status=".concat(filter) : '';
        fetch("/matches".concat(params))
            .then(function (r) { return r.json(); })
            .then(function (res) {
            setMatches(res.data);
            setLoading(false);
        })
            .catch(function () { return setLoading(false); });
    }, [filter]);
    var liveCount = matches.filter(function (m) { return m.status === 'live'; }).length;
    return (<div className="min-h-screen bg-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h1 className="text-xl font-bold text-slate-100 leading-tight">Sportz</h1>
              <p className="text-slate-500 text-xs">Live match tracker</p>
            </div>
          </div>
          {liveCount > 0 && (<div className="flex items-center gap-2 text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"/>
              {liveCount} live {liveCount === 1 ? 'match' : 'matches'}
            </div>)}
        </header>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-80 shrink-0">
            <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 mb-4">
              {FILTERS.map(function (f) { return (<button key={f.value} onClick={function () { setFilter(f.value); setSelected(null); }} className={"flex-1 text-xs py-1.5 rounded-md font-medium transition-all cursor-pointer ".concat(filter === f.value
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200')}>
                  {f.label}
                </button>); })}
            </div>

            {loading ? (<div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>
              </div>) : matches.length === 0 ? (<div className="text-center py-16 text-slate-500">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">No matches found</p>
              </div>) : (<div className="flex flex-col gap-2">
                {matches.map(function (match) { return (<MatchCard_1.MatchCard key={match.id} match={match} isSelected={(selected === null || selected === void 0 ? void 0 : selected.id) === match.id} onClick={function () { return setSelected(match); }}/>); })}
              </div>)}
          </div>

          {/* Main panel */}
          <div className="flex-1 min-w-0">
            {selected ? (<MatchDetail_1.MatchDetail key={selected.id} match={selected} onBack={function () { return setSelected(null); }}/>) : (<div className="flex flex-col items-center justify-center h-64 text-slate-600 rounded-2xl border border-slate-700/40 border-dashed">
                <p className="text-4xl mb-3">👈</p>
                <p className="text-sm">Select a match to view details</p>
              </div>)}
          </div>
        </div>
      </div>
    </div>);
}
