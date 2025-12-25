
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { Calendar, Download, AlertTriangle, CheckCircle, ShieldAlert, ChevronDown, Filter as FilterIcon } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#2563eb', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9'];

const REAL_NAMES = [
    "Alex Johnson", "Sarah Connor", "Michael Smith", "David Lee", "Emily Chen", 
    "James Wilson", "Maria Garcia", "Robert Taylor", "Lisa Anderson", "William Thomas",
    "Jennifer Martinez", "Richard Jackson", "Patricia White", "Charles Harris", "Linda Martin"
];

// --- DYNAMIC DATA GENERATORS ---

const generateTrendData = (timeFilter: string, date: string, employeeCount: number) => {
    // Scale randomness based on employee count
    const baseCount = Math.max(1, employeeCount);

    if (timeFilter === 'Daily') {
        // Hourly Breakdown (08:00 - 17:00)
        return Array.from({ length: 10 }).map((_, i) => {
            const hour = i + 8;
            const timeLabel = `${hour < 10 ? '0' : ''}${hour}:00`;
            
            // Logic: Peak attendance between 10 AM - 4 PM
            const peakFactor = (hour >= 10 && hour <= 16) ? 0.95 : 0.6; 
            const variance = 0.8 + Math.random() * 0.2; // 0.8 - 1.0
            
            const present = Math.floor(baseCount * peakFactor * variance);
            const cappedPresent = Math.min(present, baseCount);
            const remainder = baseCount - cappedPresent;
            
            // Distribute remainder between Absent and Late
            const absent = Math.floor(remainder * 0.3);
            const late = remainder - absent;

            return { name: timeLabel, Present: cappedPresent, Absent: absent, Late: late };
        });
    } else if (timeFilter === 'Monthly') {
        // Weekly Breakdown
        return Array.from({ length: 4 }).map((_, i) => {
            const weekLabel = `Week ${i + 1}`;
            const present = Math.floor(baseCount * (0.8 + Math.random() * 0.15));
            const remainder = baseCount - present;
            const absent = Math.floor(remainder * 0.6);
            const late = remainder - absent;
            
            return { name: weekLabel, Present: present, Absent: absent, Late: late };
        });
    } else {
        // Yearly Breakdown (Line Chart usually for Attendance Rate %)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.map(m => ({
            name: m,
            Attendance: Math.floor(85 + Math.random() * 14) // 85-99%
        }));
    }
};

const generateLocationData = (employeeCount: number) => {
    const baseCount = Math.max(1, employeeCount);
    // Dynamic split
    const office = Math.floor(baseCount * (0.5 + Math.random() * 0.2)); 
    const wfh = Math.floor((baseCount - office) * 0.7);
    const site = baseCount - office - wfh;
    
    return [
        { name: 'Office', value: office },
        { name: 'Work From Home', value: wfh },
        { name: 'Customer Site', value: Math.max(0, site) },
    ];
};

const generateDeptData = () => {
    // Rates are percentages, so independent of count mostly, but we randomize slightly
    return [
      { name: 'Engineering', Rate: 90 + Math.floor(Math.random() * 10) },
      { name: 'Sales', Rate: 85 + Math.floor(Math.random() * 10) },
      { name: 'HR', Rate: 95 + Math.floor(Math.random() * 5) },
      { name: 'Marketing', Rate: 88 + Math.floor(Math.random() * 10) },
      { name: 'Operations', Rate: 92 + Math.floor(Math.random() * 8) },
      { name: 'Support', Rate: 94 + Math.floor(Math.random() * 6) },
    ];
};

const generateExceptionData = (timeFilter: string, employeeCount: number) => {
    const baseCount = Math.max(1, employeeCount);
    const labels = timeFilter === 'Yearly' 
        ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        : timeFilter === 'Monthly' 
            ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // Daily view shows a week context often or hours
    
    // For Daily view in chart, let's show hourly exceptions
    const finalLabels = timeFilter === 'Daily' 
        ? ['09:00', '11:00', '13:00', '15:00', '17:00'] 
        : labels;

    return finalLabels.map(l => ({
        name: l,
        Exceptions: Math.floor(Math.random() * (baseCount * 0.2)) // Max 20% exceptions
    }));
};

const generateRequestData = (employeeCount: number) => {
    const baseCount = Math.max(1, employeeCount);
    const totalRequests = Math.ceil(baseCount * 0.8); // Not everyone requests, but multiple per person possible
    
    return [
        { name: 'Sick Leave', value: Math.floor(totalRequests * 0.15) },
        { name: 'Casual Leave', value: Math.floor(totalRequests * 0.25) },
        { name: 'Regularization', value: Math.floor(totalRequests * 0.40) },
        { name: 'Permission', value: Math.floor(totalRequests * 0.15) },
        { name: 'Location Change', value: Math.floor(totalRequests * 0.05) },
    ];
};

const generateDailyLogs = (date: string, users: string[]) => {
    const statuses = ['Present', 'Present', 'Present', 'Work From Home', 'Work From Home', 'Absent', 'Late'];
    const depts = ['Engineering', 'Sales', 'Marketing', 'HR'];
    
    return users.map((name, i) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const isPresent = status !== 'Absent';
        
        return {
            id: i,
            name: name,
            dept: depts[Math.floor(Math.random() * depts.length)],
            status: status,
            checkIn: isPresent ? `${8 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}` : '-',
            checkOut: isPresent ? `${17 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}` : '-',
            location: status === 'Work From Home' ? 'Home' : status === 'Absent' ? '-' : 'Office',
            geoStatus: status === 'Present' && Math.random() > 0.8 ? 'Outside Fence' : 'Inside Fence'
        };
    });
};

const HRReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'compliance' | 'daily'>('overview');
  
  // --- FILTERS STATE ---
  const [timeFilter, setTimeFilter] = useState<'Daily' | 'Monthly' | 'Yearly'>('Monthly');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(REAL_NAMES);
  const [isEmployeeFilterOpen, setIsEmployeeFilterOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- DERIVED DATA ---
  // Re-calculate data when filters change
  const employeeCount = selectedEmployees.length;

  const trendData = useMemo(() => generateTrendData(timeFilter, filterDate, employeeCount), [timeFilter, filterDate, employeeCount]);
  const locationData = useMemo(() => generateLocationData(employeeCount), [employeeCount, filterDate]); // Re-roll on date change too
  const deptData = useMemo(() => generateDeptData(), [filterDate]); 
  const complianceExceptionData = useMemo(() => generateExceptionData(timeFilter, employeeCount), [timeFilter, employeeCount, filterDate]);
  const requestData = useMemo(() => generateRequestData(employeeCount), [employeeCount, filterDate]);
  
  // Daily Logs Data (Filtered by selection)
  const dailyLogs = useMemo(() => generateDailyLogs(filterDate, selectedEmployees), [filterDate, selectedEmployees]);

  // KPIs
  const kpiData = useMemo(() => {
     const avgAtt = 85 + Math.floor(Math.random() * 10);
     const permReq = Math.floor(employeeCount * 0.3); // approx 30% of employees
     const exceptions = Math.floor(employeeCount * 0.15); // approx 15%
     const wfhRatio = 30 + Math.floor(Math.random() * 10);
     return { avgAtt, permReq, exceptions, wfhRatio };
  }, [employeeCount, filterDate]);


  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleEmployee = (name: string) => {
    if (selectedEmployees.includes(name)) {
        setSelectedEmployees(selectedEmployees.filter(n => n !== name));
    } else {
        setSelectedEmployees([...selectedEmployees, name]);
    }
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.length === REAL_NAMES.length) {
        setSelectedEmployees([]);
    } else {
        setSelectedEmployees(REAL_NAMES);
    }
  };

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col xl:flex-row gap-4 xl:items-center justify-between z-20 relative">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center flex-1">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
                <FilterIcon size={18} />
                <span>Filters:</span>
            </div>

            {/* Frequency Selector */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['Daily', 'Monthly', 'Yearly'] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setTimeFilter(type)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                            timeFilter === type ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Date/Time Picker */}
            <div className="relative w-full md:w-auto">
                {timeFilter === 'Daily' && (
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full md:w-auto border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
                )}
                {timeFilter === 'Monthly' && (
                    <input type="month" value={filterDate.substring(0, 7)} onChange={e => setFilterDate(e.target.value + '-01')} className="w-full md:w-auto border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
                )}
                {timeFilter === 'Yearly' && (
                   <select 
                        value={filterDate.substring(0, 4)} 
                        onChange={e => setFilterDate(e.target.value + '-01-01')}
                        className="w-full md:w-32 border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                   >
                       <option value="2024">2024</option>
                       <option value="2025">2025</option>
                       <option value="2023">2023</option>
                   </select>
                )}
            </div>
        </div>

        {/* Name Filter */}
        <div className="relative w-full xl:w-auto" ref={dropdownRef}>
             <button 
                onClick={() => setIsEmployeeFilterOpen(!isEmployeeFilterOpen)}
                className="w-full xl:w-72 flex justify-between items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             >
                <span className="truncate">
                    {selectedEmployees.length === REAL_NAMES.length 
                        ? 'All Employees' 
                        : selectedEmployees.length === 0 
                            ? 'Select Employees' 
                            : `${selectedEmployees.length} Employee${selectedEmployees.length > 1 ? 's' : ''} Selected`}
                </span>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isEmployeeFilterOpen ? 'rotate-180' : ''}`} />
             </button>
             
             {isEmployeeFilterOpen && (
                 <div className="absolute top-full right-0 mt-2 w-full xl:w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-80 overflow-y-auto p-2">
                     <label className="flex items-center px-3 py-2.5 hover:bg-blue-50 rounded-md cursor-pointer transition-colors">
                         <input 
                            type="checkbox" 
                            checked={selectedEmployees.length === REAL_NAMES.length}
                            onChange={toggleAllEmployees}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mr-3"
                         />
                         <span className="text-sm font-semibold text-gray-900">Select All</span>
                     </label>
                     <div className="h-px bg-gray-100 my-1"></div>
                     {REAL_NAMES.map(name => (
                         <label key={name} className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
                             <input 
                                type="checkbox"
                                checked={selectedEmployees.includes(name)}
                                onChange={() => toggleEmployee(name)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mr-3"
                             />
                             <span className="text-sm text-gray-700">{name}</span>
                         </label>
                     ))}
                 </div>
             )}
        </div>
    </div>
  );

  const renderOverview = () => (
      <div className="space-y-6 animate-fade-in">
          {renderFilters()}
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-xs font-bold uppercase">Avg Attendance</p>
                  <div className="flex items-end justify-between">
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpiData.avgAtt}%</h3>
                      <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded">+2% vs last {timeFilter.toLowerCase().replace('ly', '')}</span>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-xs font-bold uppercase">Permissions Req.</p>
                  <div className="flex items-end justify-between">
                      <h3 className="text-2xl font-bold text-blue-900 mt-1">{kpiData.permReq}</h3>
                      <span className="text-gray-500 text-xs">This {timeFilter.toLowerCase().replace('ly', '')}</span>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-xs font-bold uppercase">Geo Exceptions</p>
                  <div className="flex items-end justify-between">
                      <h3 className="text-2xl font-bold text-orange-600 mt-1">{kpiData.exceptions}</h3>
                      <span className="text-red-600 text-xs font-medium bg-red-50 px-2 py-0.5 rounded">+3 vs last {timeFilter.toLowerCase().replace('ly', '')}</span>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-xs font-bold uppercase">WFH Ratio</p>
                  <div className="flex items-end justify-between">
                      <h3 className="text-2xl font-bold text-blue-600 mt-1">{kpiData.wfhRatio}%</h3>
                      <span className="text-gray-500 text-xs">Stable</span>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Location Compliance */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-semibold text-gray-800">Location Compliance</h3>
                      <button className="text-gray-400 hover:text-gray-600"><Download size={16}/></button>
                  </div>
                  <div className="h-64 flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={locationData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {locationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Department Metrics */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-semibold text-gray-800">Attendance by Department</h3>
                      <select className="text-xs border-gray-300 rounded-lg p-1">
                          <option>This Month</option>
                          <option>Last Month</option>
                      </select>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" axisLine={false} tickLine={false} domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '12px' }} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                            <Bar dataKey="Rate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderTrends = () => {
      let chartType = 'bar'; // default
      if (timeFilter === 'Yearly') {
          chartType = 'line';
      }

      return (
        <div className="space-y-6 animate-fade-in">
            {renderFilters()}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-gray-800">
                        {timeFilter} Attendance Trends
                        {selectedEmployees.length < REAL_NAMES.length && <span className="text-sm font-normal text-gray-500 ml-2">(Filtered by {selectedEmployees.length} employees)</span>}
                    </h3>
                </div>
                
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'line' ? (
                             <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                <Legend />
                                <Line type="monotone" dataKey="Attendance" stroke="#2563eb" strokeWidth={3} dot={{r:4}} />
                            </LineChart>
                        ) : (
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                <Legend />
                                <Bar dataKey="Present" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      );
  };

  const renderCompliance = () => (
      <div className="space-y-6 animate-fade-in">
          {renderFilters()}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Permission Request Frequency */}
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-6">Permission & Request Breakdown</h3>
                  <div className="h-64 flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={requestData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {requestData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Geo Fencing Exceptions */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-6">Geo-Fencing Exceptions ({timeFilter})</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={complianceExceptionData}>
                            <defs>
                                <linearGradient id="colorExceptions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="Exceptions" stroke="#ef4444" fillOpacity={1} fill="url(#colorExceptions)" />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderDailyLogsTab = () => (
      <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <h3 className="font-bold text-gray-800">Daily Attendance Log</h3>
                      <p className="text-sm text-gray-500">Who was present on {format(new Date(filterDate), 'MMMM do, yyyy')}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                       {/* Reusing the employee filter dropdown here effectively via the name column, but for clarity let's show date picker */}
                      <div className="bg-white border border-gray-300 rounded-lg px-3 py-2 flex items-center">
                          <Calendar size={16} className="text-gray-400 mr-2"/>
                          <input 
                            type="date" 
                            value={filterDate} 
                            onChange={e => setFilterDate(e.target.value)} 
                            className="text-sm bg-transparent border-none focus:ring-0 p-0 outline-none" 
                          />
                      </div>
                       {/* Name Filter Trigger (Simplified for this view since main filter is separate in other tabs) */}
                        <div className="relative" ref={dropdownRef}>
                             <button 
                                onClick={() => setIsEmployeeFilterOpen(!isEmployeeFilterOpen)}
                                className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                             >
                                <FilterIcon size={16} className="text-gray-500"/>
                                <span>{selectedEmployees.length === REAL_NAMES.length ? 'All Employees' : `${selectedEmployees.length} Selected`}</span>
                             </button>
                             {isEmployeeFilterOpen && (
                                 <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-80 overflow-y-auto p-2">
                                     <label className="flex items-center px-3 py-2.5 hover:bg-blue-50 rounded-md cursor-pointer transition-colors">
                                         <input 
                                            type="checkbox" 
                                            checked={selectedEmployees.length === REAL_NAMES.length}
                                            onChange={toggleAllEmployees}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mr-3"
                                         />
                                         <span className="text-sm font-semibold text-gray-900">Select All</span>
                                     </label>
                                     <div className="h-px bg-gray-100 my-1"></div>
                                     {REAL_NAMES.map(name => (
                                         <label key={name} className="flex items-center px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
                                             <input 
                                                type="checkbox"
                                                checked={selectedEmployees.includes(name)}
                                                onChange={() => toggleEmployee(name)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mr-3"
                                             />
                                             <span className="text-sm text-gray-700">{name}</span>
                                         </label>
                                     ))}
                                 </div>
                             )}
                        </div>
                      <button className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                          <Download size={16}/>
                          <span>Export CSV</span>
                      </button>
                  </div>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                          <tr>
                              <th className="px-6 py-4">Employee</th>
                              <th className="px-6 py-4">Department</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Check In</th>
                              <th className="px-6 py-4">Check Out</th>
                              <th className="px-6 py-4">Geo Compliance</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {dailyLogs.length === 0 ? (
                              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No employees selected.</td></tr>
                          ) : (
                              dailyLogs.map((log) => (
                                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 font-medium text-gray-900">{log.name}</td>
                                      <td className="px-6 py-4 text-gray-500">{log.dept}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                              log.status === 'Present' ? 'bg-green-100 text-green-700' :
                                              log.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                              log.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-blue-100 text-blue-700'
                                          }`}>
                                              {log.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-gray-600">{log.checkIn}</td>
                                      <td className="px-6 py-4 text-gray-600">{log.checkOut}</td>
                                      <td className="px-6 py-4">
                                          {log.geoStatus === 'Outside Fence' ? (
                                              <div className="flex items-center text-red-600 text-xs font-medium">
                                                  <AlertTriangle size={14} className="mr-1"/> Outside Fence
                                              </div>
                                          ) : log.status === 'Absent' ? (
                                              <span className="text-gray-300">-</span>
                                          ) : (
                                              <div className="flex items-center text-green-600 text-xs font-medium">
                                                  <CheckCircle size={14} className="mr-1"/> Compliant
                                              </div>
                                          )}
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
                  Showing {dailyLogs.length} records for {format(new Date(filterDate), 'yyyy-MM-dd')}
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
                <p className="text-gray-500 text-sm">Comprehensive insights into workforce attendance and compliance.</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'daily', label: 'Daily Logs' },
                    { id: 'trends', label: 'Trends' },
                    { id: 'compliance', label: 'Compliance' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                            activeTab === tab.id 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Render */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'daily' && renderDailyLogsTab()}
        {activeTab === 'trends' && renderTrends()}
        {activeTab === 'compliance' && renderCompliance()}
    </div>
  );
};

export default HRReports;