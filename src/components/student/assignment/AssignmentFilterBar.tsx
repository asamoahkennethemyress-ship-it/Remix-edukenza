import React from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  LayoutGrid, 
  List, 
  X,
  RotateCcw
} from 'lucide-react';

interface AssignmentFilterBarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedSubject: string;
  setSelectedSubject: (v: string) => void;
  selectedStatus: string;
  setSelectedStatus: (v: string) => void;
  selectedDueDateFilter: string;
  setSelectedDueDateFilter: (v: string) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (v: 'asc' | 'desc') => void;
  viewMode: 'card' | 'table';
  setViewMode: (v: 'card' | 'table') => void;
  subjectsList: string[];
  typesList: string[];
  totalResults: number;
}

export const AssignmentFilterBar: React.FC<AssignmentFilterBarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedSubject,
  setSelectedSubject,
  selectedStatus,
  setSelectedStatus,
  selectedDueDateFilter,
  setSelectedDueDateFilter,
  selectedType,
  setSelectedType,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  subjectsList,
  typesList,
  totalResults
}) => {
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedSubject('All');
    setSelectedStatus('All');
    setSelectedDueDateFilter('All');
    setSelectedType('All');
    setSortBy('dueDate');
    setSortOrder('asc');
  };

  const hasActiveFilters = 
    searchTerm !== '' || 
    selectedSubject !== 'All' || 
    selectedStatus !== 'All' || 
    selectedDueDateFilter !== 'All' || 
    selectedType !== 'All';

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
      
      {/* TOP ROW: SEARCH, VIEW TOGGLE, COUNTER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        
        {/* SEARCH INPUT */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, subject, or teacher name..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#002147] focus:border-transparent outline-none transition"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* RIGHT CONTROLS: VIEW MODE & SORTING */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          
          <span className="text-xs font-bold text-slate-500 font-mono">
            {totalResults} {totalResults === 1 ? 'Assignment' : 'Assignments'}
          </span>

          {/* VIEW MODE TOGGLE */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'card' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Card</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: FILTERS & SORT DROPDOWNS */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
        
        <div className="flex items-center gap-1.5 text-[#002147] mr-1">
          <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Filters:</span>
        </div>

        {/* SUBJECT FILTER */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002147]"
        >
          <option value="All">All Subjects</option>
          {subjectsList.map(subj => (
            <option key={subj} value={subj}>{subj}</option>
          ))}
        </select>

        {/* STATUS FILTER */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002147]"
        >
          <option value="All">All Statuses</option>
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Submitted">Submitted</option>
          <option value="Graded">Graded</option>
          <option value="Returned">Returned for Correction</option>
          <option value="Missing">Missing</option>
          <option value="Overdue">Overdue</option>
        </select>

        {/* DUE DATE FILTER */}
        <select
          value={selectedDueDateFilter}
          onChange={(e) => setSelectedDueDateFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002147]"
        >
          <option value="All">All Due Dates</option>
          <option value="Due Today">Due Today</option>
          <option value="This Week">Due This Week</option>
          <option value="Overdue">Overdue Only</option>
        </select>

        {/* TYPE FILTER */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002147]"
        >
          <option value="All">All Types</option>
          {typesList.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* SORT BY */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-slate-400 font-normal">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002147]"
          >
            <option value="dueDate">Due Date</option>
            <option value="publishedDate">Published Date</option>
            <option value="subject">Subject</option>
            <option value="priority">Priority</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 font-bold"
            title={`Toggle order (${sortOrder.toUpperCase()})`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* RESET FILTERS */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}

      </div>

    </div>
  );
};
