# Web App State Management Simplification

This document provides concrete examples of simplifying the web app's state management to align with our architectural philosophy: **"explicit, straightforward code over clever abstractions."**

## Philosophy

> "The best code is code that doesn't need to exist. Only add abstractions when you have a real, recurring problem to solve."

## 1. Global Store Simplification

### ❌ BEFORE: Monolithic 270-line store with complex middleware

```typescript
// stores/global.ts - 270 lines of complexity
import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import superjson from 'superjson'

interface NotificationSlice {
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

interface ModalSlice {
  openModals: Set<string>
  modalData: Record<string, any>
  openModal: (id: string, data?: any) => void
  closeModal: (id: string) => void
  isModalOpen: (id: string) => boolean
}

interface FormSlice {
  formData: Record<string, any>
  formErrors: Record<string, string[]>
  setFormData: (form: string, data: any) => void
  setFormErrors: (form: string, errors: string[]) => void
  clearForm: (form: string) => void
}

interface UserPreferencesSlice {
  theme: 'light' | 'dark'
  selectedGuildId: string | null
  sidebarCollapsed: boolean
  setTheme: (theme: 'light' | 'dark') => void
  setSelectedGuildId: (id: string | null) => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

interface GlobalStore extends NotificationSlice, ModalSlice, FormSlice, UserPreferencesSlice {}

const useGlobalStore = create<GlobalStore>()(
  devtools(
    persist(
      immer(
        subscribeWithSelector((set, get) => ({
          // ... 200+ lines of implementation
        }))
      ),
      {
        name: 'global-store',
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            return superjson.parse(str)
          },
          setItem: (name, value) => {
            localStorage.setItem(name, superjson.stringify(value))
          },
          removeItem: (name) => localStorage.removeItem(name),
        },
      }
    )
  )
)

// 20+ atomic selectors
export const useNotifications = () => useGlobalStore(state => state.notifications)
export const useAddNotification = () => useGlobalStore(state => state.addNotification)
export const useRemoveNotification = () => useGlobalStore(state => state.removeNotification)
export const useClearNotifications = () => useGlobalStore(state => state.clearNotifications)
export const useOpenModals = () => useGlobalStore(state => state.openModals)
export const useModalData = () => useGlobalStore(state => state.modalData)
export const useOpenModal = () => useGlobalStore(state => state.openModal)
export const useCloseModal = () => useGlobalStore(state => state.closeModal)
export const useIsModalOpen = () => useGlobalStore(state => state.isModalOpen)
export const useTheme = () => useGlobalStore(state => state.theme)
export const useSelectedGuildId = () => useGlobalStore(state => state.selectedGuildId)
// ... 10+ more selectors
```

### ✅ AFTER: Simple, focused stores (60 lines total)

```typescript
// stores/app-store.ts - 20 lines
import { create } from 'zustand'

interface AppState {
  selectedGuildId: string | null
  setSelectedGuildId: (id: string | null) => void
}

export const useAppStore = create<AppState>()((set) => ({
  selectedGuildId: null,
  setSelectedGuildId: (id) => set({ selectedGuildId: id }),
}))

// stores/modal-store.ts - 20 lines
interface ModalState {
  openModals: Set<string>
  open: (id: string) => void
  close: (id: string) => void
}

export const useModalStore = create<ModalState>()((set) => ({
  openModals: new Set(),
  open: (id) => set(state => ({ 
    openModals: new Set([...state.openModals, id]) 
  })),
  close: (id) => set(state => ({ 
    openModals: new Set([...state.openModals].filter(m => m !== id))
  })),
}))

// stores/user-preferences.ts - 20 lines with simple localStorage
interface UserPreferences {
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  setTheme: (theme: 'light' | 'dark') => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const usePreferences = create<UserPreferences>()((set) => ({
  theme: (typeof window !== 'undefined' && 
    localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  sidebarCollapsed: false,
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}))
```

## 2. Feature Store Simplification

### ❌ BEFORE: Over-abstracted with atomic selectors

```typescript
// features/tickets/stores/tickets-ui-store.ts
interface TicketsUIState {
  searchQuery: string
  activeTab: 'active' | 'closed'
  selectedTicketId: string | null
  filters: {
    status: string[]
    priority: string[]
    assignee: string[]
  }
  sort: {
    field: 'createdAt' | 'updatedAt' | 'priority'
    direction: 'asc' | 'desc'
  }
  
  // Actions
  setSearchQuery: (query: string) => void
  setActiveTab: (tab: 'active' | 'closed') => void
  setSelectedTicketId: (id: string | null) => void
  setFilters: (filters: Partial<TicketsUIState['filters']>) => void
  setSort: (sort: TicketsUIState['sort']) => void
  clearFilters: () => void
}

const useTicketsUIStore = create<TicketsUIState>()(
  devtools((set) => ({
    searchQuery: '',
    activeTab: 'active',
    selectedTicketId: null,
    filters: {
      status: [],
      priority: [],
      assignee: [],
    },
    sort: {
      field: 'createdAt',
      direction: 'desc',
    },
    // ... actions implementation
  }))
)

// 8 atomic selectors - unnecessary abstraction
export const useTicketSearch = () => useTicketsUIStore(state => state.searchQuery)
export const useTicketTab = () => useTicketsUIStore(state => state.activeTab)
export const useSelectedTicketId = () => useTicketsUIStore(state => state.selectedTicketId)
export const useTicketFilters = () => useTicketsUIStore(state => state.filters)
export const useTicketSort = () => useTicketsUIStore(state => state.sort)
export const useSetTicketSearch = () => useTicketsUIStore(state => state.setSearchQuery)
export const useSetTicketTab = () => useTicketsUIStore(state => state.setActiveTab)
export const useSelectTicket = () => useTicketsUIStore(state => state.setSelectedTicketId)

// Action bundler hook - just re-exports the same functions
export const useTicketUIActions = () => {
  const setSearchQuery = useTicketsUIStore(state => state.setSearchQuery)
  const setActiveTab = useTicketsUIStore(state => state.setActiveTab)
  const setSelectedTicketId = useTicketsUIStore(state => state.setSelectedTicketId)
  const setFilters = useTicketsUIStore(state => state.setFilters)
  const setSort = useTicketsUIStore(state => state.setSort)
  const clearFilters = useTicketsUIStore(state => state.clearFilters)
  
  return {
    setSearchQuery,
    setActiveTab,
    setSelectedTicketId,
    setFilters,
    setSort,
    clearFilters,
  }
}
```

### ✅ AFTER: Direct usage pattern

```typescript
// features/tickets/stores/tickets-store.ts
interface TicketsState {
  filters: {
    status: string[]
    assignee: string[]
  }
  selectedId: string | null
  setFilters: (filters: Partial<TicketsState['filters']>) => void
  selectTicket: (id: string | null) => void
}

export const useTicketsStore = create<TicketsState>()((set) => ({
  filters: { status: [], assignee: [] },
  selectedId: null,
  setFilters: (filters) => set(state => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  selectTicket: (id) => set({ selectedId: id }),
}))

// That's it! Use it directly in components:
function TicketList() {
  // Direct property access - no wrappers
  const filters = useTicketsStore(s => s.filters)
  const setFilters = useTicketsStore(s => s.setFilters)
  
  // Or get multiple values at once
  const { filters, selectedId, selectTicket } = useTicketsStore()
  
  // Clear, direct, no indirection
  return (
    <FilterBar 
      filters={filters} 
      onChange={setFilters} 
    />
  )
}
```

## 3. Controller Hook Elimination

### ❌ BEFORE: Multiple layers of wrapper hooks

```typescript
// hooks/use-ticket-ui-state.ts
export function useTicketUIState() {
  const searchQuery = useTicketSearch()
  const activeTab = useTicketTab()
  const selectedTicketId = useSelectedTicketId()
  const filters = useTicketFilters()
  const sort = useTicketSort()
  const actions = useTicketUIActions()
  
  return {
    searchQuery,
    activeTab,
    selectedTicketId,
    filters,
    sort,
    ...actions,
  }
}

// hooks/use-ticket-list.ts
export function useTicketList() {
  const ui = useTicketUIState()
  const { selectedGuildId } = useGlobalState()
  const query = useTicketQueries()
  
  const filteredTickets = useMemo(() => {
    if (!query.data) return []
    
    return query.data
      .filter(ticket => {
        if (ui.searchQuery) {
          return ticket.subject.toLowerCase().includes(ui.searchQuery.toLowerCase())
        }
        return true
      })
      .filter(ticket => {
        if (ui.filters.status.length > 0) {
          return ui.filters.status.includes(ticket.status)
        }
        return true
      })
      .sort((a, b) => {
        const direction = ui.sort.direction === 'asc' ? 1 : -1
        return direction * (a[ui.sort.field] - b[ui.sort.field])
      })
  }, [query.data, ui.searchQuery, ui.filters, ui.sort])
  
  return {
    tickets: filteredTickets,
    isLoading: query.isLoading,
    error: query.error,
    ui,
    refetch: query.refetch,
  }
}

// Component using controller
function TicketsPage() {
  const { tickets, isLoading, error, ui } = useTicketList()
  
  // So many layers to trace through!
  return <TicketTable tickets={tickets} />
}
```

### ✅ AFTER: Direct, explicit usage

```typescript
// No wrapper hooks - use stores and queries directly
function TicketList() {
  const guildId = useAppStore(s => s.selectedGuildId)
  const { filters, selectedId, selectTicket } = useTicketsStore()
  
  // Direct query - no wrapper
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', guildId, filters],
    queryFn: () => api.getTickets(guildId, filters),
    enabled: !!guildId,
  })
  
  if (isLoading) return <Spinner />
  
  // Direct usage, easy to trace
  return (
    <div>
      {tickets?.map(ticket => (
        <TicketCard 
          key={ticket.id}
          ticket={ticket}
          selected={ticket.id === selectedId}
          onClick={() => selectTicket(ticket.id)}
        />
      ))}
    </div>
  )
}

// Need filtering? Do it inline where it's used
function FilteredTicketList() {
  const { filters } = useTicketsStore()
  const { data: tickets } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => api.getTickets(filters),
  })
  
  // Filter inline if needed - explicit and clear
  const activeTickets = tickets?.filter(t => t.status !== 'closed')
  
  return <TicketTable tickets={activeTickets} />
}
```

## 4. Query Pattern Simplification

### ❌ BEFORE: Query object factories

```typescript
// queries/ticket-queries.ts
export const ticketQueries = {
  all: (guildId: string) => ({
    queryKey: ['tickets', 'all', guildId] as const,
    queryFn: () => api.tickets.getAll(guildId),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  }),
  
  list: (guildId: string, filters?: TicketFilters) => ({
    queryKey: ['tickets', 'list', guildId, filters] as const,
    queryFn: () => api.tickets.getList({ guildId, ...filters }),
    staleTime: 30 * 1000,
  }),
  
  detail: (ticketId: string) => ({
    queryKey: ['tickets', 'detail', ticketId] as const,
    queryFn: () => api.tickets.getById(ticketId),
    staleTime: 60 * 1000,
  }),
  
  messages: (ticketId: string) => ({
    queryKey: ['tickets', 'messages', ticketId] as const,
    queryFn: () => api.tickets.getMessages(ticketId),
    refetchInterval: 5000,
  }),
}

// Usage requires importing and calling factory
import { ticketQueries } from '@/queries/ticket-queries'

function TicketDetail({ id }: { id: string }) {
  const query = useQuery(ticketQueries.detail(id))
  // ...
}
```

### ✅ AFTER: Simple async functions

```typescript
// lib/api/tickets.ts - Simple async functions
export async function getTickets(guildId: string, filters?: TicketFilters) {
  const params = new URLSearchParams(filters as any)
  const res = await fetch(`${API_URL}/guilds/${guildId}/tickets?${params}`)
  if (!res.ok) throw new Error('Failed to fetch tickets')
  return res.json()
}

export async function getTicket(id: string) {
  const res = await fetch(`${API_URL}/tickets/${id}`)
  if (!res.ok) throw new Error('Failed to fetch ticket')
  return res.json()
}

// Direct usage in components
function TicketDetail({ id }: { id: string }) {
  const { data: ticket } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
  })
  
  return <div>{ticket?.subject}</div>
}

// Need messages with polling? Inline it
function TicketMessages({ ticketId }: { ticketId: string }) {
  const { data: messages } = useQuery({
    queryKey: ['messages', ticketId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/tickets/${ticketId}/messages`)
      return res.json()
    },
    refetchInterval: 5000, // Poll for new messages
  })
  
  return <MessageList messages={messages} />
}
```

## 5. Real-World Component Example

### ❌ BEFORE: Using all the abstractions

```typescript
// pages/tickets.tsx
import { TicketsStoreProvider } from '@/features/tickets/stores'
import { useTicketList } from '@/features/tickets/hooks/use-ticket-list'
import { useTicketUIState } from '@/features/tickets/hooks/use-ticket-ui-state'
import { ticketQueries } from '@/features/tickets/queries'

function TicketsPageContent() {
  const { tickets, isLoading, error, ui } = useTicketList()
  const { filters, setFilters } = useTicketUIState()
  const selectedGuildId = useSelectedGuildId()
  
  const { data: summary } = useQuery(
    ticketQueries.summary(selectedGuildId!)
  )
  
  return (
    <div>
      <TicketFilters 
        filters={filters} 
        onChange={setFilters}
      />
      <TicketTable 
        tickets={tickets}
        onSelect={ui.setSelectedTicketId}
      />
    </div>
  )
}

export default function TicketsPage() {
  return (
    <TicketsStoreProvider>
      <TicketsPageContent />
    </TicketsStoreProvider>
  )
}
```

### ✅ AFTER: Direct and simple

```typescript
// pages/tickets.tsx
import { useAppStore } from '@/stores/app-store'
import { useTicketsStore } from '@/features/tickets/stores'
import { getTickets } from '@/lib/api/tickets'

export default function TicketsPage() {
  const guildId = useAppStore(s => s.selectedGuildId)
  const { filters, setFilters, selectedId, selectTicket } = useTicketsStore()
  
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', guildId, filters],
    queryFn: () => getTickets(guildId!, filters),
    enabled: !!guildId,
  })
  
  if (!guildId) return <SelectGuildPrompt />
  if (isLoading) return <LoadingSpinner />
  
  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <FilterBar filters={filters} onChange={setFilters} />
        
        <div className="space-y-2">
          {tickets?.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              selected={ticket.id === selectedId}
              onClick={() => selectTicket(ticket.id)}
            />
          ))}
        </div>
      </div>
      
      {selectedId && (
        <TicketDetail ticketId={selectedId} />
      )}
    </div>
  )
}
```

## Migration Strategy

### Step 1: Start with new features
Use the simplified patterns for any new features you build.

### Step 2: Migrate during regular work
When you touch old code, simplify it:
- Remove atomic selectors
- Eliminate wrapper hooks
- Use stores directly
- Simplify queries to functions

### Step 3: Update imports gradually
```typescript
// Old
import { useSelectedGuildId } from '@/stores/global'

// New
import { useAppStore } from '@/stores/app-store'
const guildId = useAppStore(s => s.selectedGuildId)
```

### Step 4: Remove old code
Once all references are updated, delete:
- Old global store file
- Atomic selector exports
- Controller hooks
- Query factories

## Benefits Summary

### Before
- **32 abstraction layers** to understand
- **500+ lines** of state management code
- **7 patterns** to learn (stores, slices, selectors, controllers, providers, queries, actions)
- **Complex debugging** with wrapper indirection
- **Hard for AI** to understand context

### After  
- **3 simple stores** with direct access
- **~150 lines** of state code (-70%)
- **2 patterns** to learn (Zustand stores, React Query)
- **Direct debugging** - trace from component to API
- **AI-friendly** - explicit patterns need no context

## Testing the Simplified Code

```typescript
// Simple to test - no complex mocking needed
describe('TicketsPage', () => {
  it('filters tickets', async () => {
    // Mock the API directly
    const mockTickets = [
      { id: '1', subject: 'Bug', status: 'open' },
      { id: '2', subject: 'Feature', status: 'closed' },
    ]
    
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockTickets,
    })
    
    render(<TicketsPage />)
    
    // Direct interaction, no wrapper mocking
    const filterButton = screen.getByText('Open tickets')
    fireEvent.click(filterButton)
    
    expect(screen.queryByText('Bug')).toBeInTheDocument()
    expect(screen.queryByText('Feature')).not.toBeInTheDocument()
  })
})
```

## Remember the Philosophy

> "The best code is code that doesn't need to exist. Only add abstractions when you have a real, recurring problem to solve."

Every abstraction layer is a barrier between developers and understanding. For a small team, **explicit and straightforward beats clever and abstract every time**.