"use client";

import * as React from "react";
import {
  Building,
  User,
  Cash,
  ChartPie,
  Plus,
  Download,
  InfoCircle,
  CheckCircle,
  ExclamationCircle,
  Envelope,
  DotsHorizontal,
  FileLines,
} from "flowbite-react-icons/outline";

import { Heading, Text } from "@/components/ui/typography";
import { CountUp } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LineChart, BarChart, AreaChart, DonutChart } from "@/components/ui/chart";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
} from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/pagination";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Toaster, toast } from "@/components/ui/sonner";

/* ------------------------------------------------------------------ mocks */

type Lead = {
  id: string;
  name: string;
  type: string;
  location: string;
  units: number;
  status: "New" | "Contacted" | "Won";
};

const LEADS: Lead[] = [
  { id: "1", name: "Nakasero Heights", type: "Residential", location: "Kampala", units: 48, status: "Won" },
  { id: "2", name: "Kololo Court", type: "Condominium", location: "Kampala", units: 24, status: "New" },
  { id: "3", name: "Entebbe Villas", type: "Residential", location: "Entebbe", units: 12, status: "Contacted" },
  { id: "4", name: "Ntinda Plaza", type: "Commercial", location: "Kampala", units: 30, status: "New" },
  { id: "5", name: "Munyonyo Suites", type: "Residential", location: "Kampala", units: 60, status: "Won" },
  { id: "6", name: "Bugolobi Lofts", type: "Condominium", location: "Kampala", units: 18, status: "Contacted" },
  { id: "7", name: "Naguru Ridge", type: "Residential", location: "Kampala", units: 40, status: "New" },
  { id: "8", name: "Jinja Riverside", type: "Institutional", location: "Jinja", units: 22, status: "Contacted" },
  { id: "9", name: "Muyenga Towers", type: "Residential", location: "Kampala", units: 52, status: "Won" },
  { id: "10", name: "Lugogo Offices", type: "Commercial", location: "Kampala", units: 16, status: "New" },
];

const statusVariant = {
  New: "muted",
  Contacted: "secondary",
  Won: "default",
} as const;

const columns: Column<Lead>[] = [
  { key: "name", header: "Property", sortable: true },
  { key: "type", header: "Type" },
  { key: "location", header: "Location" },
  { key: "units", header: "Units", sortable: true, align: "right" },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
  },
];

const revenueData = [
  { month: "Jan", revenue: 32, expenses: 18 },
  { month: "Feb", revenue: 41, expenses: 21 },
  { month: "Mar", revenue: 38, expenses: 19 },
  { month: "Apr", revenue: 52, expenses: 24 },
  { month: "May", revenue: 49, expenses: 22 },
  { month: "Jun", revenue: 61, expenses: 27 },
];

const occupancyData = [
  { name: "Occupied", value: 82 },
  { name: "Vacant", value: 12 },
  { name: "Notice", value: 6 },
];

/* --------------------------------------------------------------- section */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <Heading as="h2" size="h2" className="mb-6">
        {title}
      </Heading>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------- showcase */

export function ComponentsShowcase() {
  const [tableState, setTableState] = React.useState<"data" | "loading" | "error" | "empty">("data");
  const [date, setDate] = React.useState<Date | undefined>();
  const [page, setPage] = React.useState(3);

  return (
    <TooltipProvider delayDuration={200}>
      <Toaster />

      {/* Buttons */}
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button>
            <Plus size={18} /> With icon
          </Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="icon" aria-label="Add">
            <Plus size={18} />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      {/* Form controls */}
      <Section title="Form controls">
        <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sg-name">Full name</Label>
            <Input id="sg-name" placeholder="Jane Nakato" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-email">Email (invalid state)</Label>
            <Input id="sg-email" type="email" defaultValue="not-an-email" aria-invalid />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-type">Property type</Label>
            <Select>
              <SelectTrigger id="sg-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="condominium">Condominium</SelectItem>
                <SelectItem value="institutional">Institutional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Move-in date</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sg-msg">Message</Label>
            <Textarea id="sg-msg" placeholder="How can we help?" />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="sg-terms" defaultChecked />
            <Label htmlFor="sg-terms">I agree to the terms</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="sg-notify" defaultChecked />
            <Label htmlFor="sg-notify">Email notifications</Label>
          </div>
          <RadioGroup defaultValue="owner" className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="owner" id="sg-owner" />
              <Label htmlFor="sg-owner">Property owner</Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="tenant" id="sg-tenant" />
              <Label htmlFor="sg-tenant">Tenant</Label>
            </div>
          </RadioGroup>
          <div className="sm:col-span-2">
            <Label className="mb-2 block">Documents</Label>
            <FileUpload accept="PDF, PNG, JPG" />
          </div>
        </div>
      </Section>

      {/* Cards + stats */}
      <Section title="Cards & KPI tiles">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Default card</CardTitle>
              <CardDescription>Border, background surface, 24px padding.</CardDescription>
            </CardHeader>
            <CardContent>
              <Text variant="muted">Body content sits here on tokens.</Text>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="outline">
                Action
              </Button>
            </CardFooter>
          </Card>
          <Card variant="interactive">
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardDescription>Hover to lift + primary outline.</CardDescription>
            </CardHeader>
            <CardContent>
              <Text variant="muted">Use for clickable tiles.</Text>
            </CardContent>
          </Card>
          <StatCard
            label="Units managed"
            value={<CountUp to={1200} suffix="+" />}
            icon={<Building size={22} />}
            trend={{ value: "8.2%", direction: "up" }}
            hint="vs last quarter"
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Occupancy" value={<CountUp to={98} suffix="%" />} icon={<ChartPie size={22} />} />
          <StatCard label="Owners" value={<CountUp to={340} />} icon={<User size={22} />} trend={{ value: "3.1%", direction: "up" }} />
          <StatCard label="Arrears" value={<CountUp to={4} suffix="%" />} icon={<Cash size={22} />} trend={{ value: "1.4%", direction: "down" }} />
          <StatCard label="Years" value={<CountUp to={12} />} icon={<FileLines size={22} />} />
        </div>
      </Section>

      {/* Badges + avatars */}
      <Section title="Badges & avatars">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="muted">Muted</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge>
            <CheckCircle size={14} /> Verified
          </Badge>
        </div>
        <div className="mt-5 flex items-center gap-6">
          <Avatar>
            <AvatarImage src="/images/properties/interior-living-room.jpg" alt="" />
            <AvatarFallback>JN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AM</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>C</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>+5</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </div>
      </Section>

      {/* Tabs */}
      <Section title="Tabs">
        <div className="grid gap-8 lg:grid-cols-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="units">Units</TabsTrigger>
              <TabsTrigger value="docs">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Text variant="muted">Underline tabs — for page-level sections.</Text>
            </TabsContent>
            <TabsContent value="units">
              <Text variant="muted">Units content.</Text>
            </TabsContent>
            <TabsContent value="docs">
              <Text variant="muted">Documents content.</Text>
            </TabsContent>
          </Tabs>
          <Tabs defaultValue="monthly">
            <TabsList variant="pill">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">
              <Text variant="muted">Pill tabs — for compact toggles.</Text>
            </TabsContent>
            <TabsContent value="quarterly">
              <Text variant="muted">Quarterly content.</Text>
            </TabsContent>
            <TabsContent value="yearly">
              <Text variant="muted">Yearly content.</Text>
            </TabsContent>
          </Tabs>
        </div>
      </Section>

      {/* Data table */}
      <Section title="Data table (sortable · selectable · paginated · states)">
        <div className="mb-4 flex flex-wrap gap-2">
          {(["data", "loading", "empty", "error"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={tableState === s ? "primary" : "outline"}
              onClick={() => setTableState(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <DataTable
          columns={columns}
          data={tableState === "empty" ? [] : LEADS}
          getRowId={(r) => r.id}
          selectable
          pageSize={6}
          loading={tableState === "loading"}
          error={tableState === "error" ? "Network request failed." : null}
          onRetry={() => setTableState("data")}
        />
      </Section>

      {/* Charts */}
      <Section title="Charts (themed to palette)">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs expenses</CardTitle>
              <CardDescription>Line chart</CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={revenueData}
                xKey="month"
                series={[
                  { key: "revenue", label: "Revenue" },
                  { key: "expenses", label: "Expenses" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
              <CardDescription>Bar chart</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart data={revenueData} xKey="month" series={[{ key: "revenue", label: "Revenue" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Growth</CardTitle>
              <CardDescription>Area chart</CardDescription>
            </CardHeader>
            <CardContent>
              <AreaChart data={revenueData} xKey="month" series={[{ key: "revenue", label: "Revenue" }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Occupancy split</CardTitle>
              <CardDescription>Donut chart</CardDescription>
            </CardHeader>
            <CardContent>
              <DonutChart data={occupancyData} />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Overlays & feedback */}
      <Section title="Overlays & feedback">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm assessment</DialogTitle>
                <DialogDescription>
                  Request a free property assessment for Nakasero Heights?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Confirm</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Refine the portfolio list.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions <DotsHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Manage</DropdownMenuLabel>
              <DropdownMenuItem>
                <User size={16} /> View owner
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download size={16} /> Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Envelope size={16} /> Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Info">
                <InfoCircle size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Occupancy across all units</TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <Text variant="muted">Popover content on tokens.</Text>
            </PopoverContent>
          </Popover>

          <Button onClick={() => toast.success("Assessment requested", { description: "We’ll be in touch shortly." })}>
            Show toast
          </Button>
        </div>

        <div className="mt-6 grid max-w-2xl gap-3">
          <Alert variant="info">
            <InfoCircle size={20} />
            <div>
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>Monthly statements are ready to download.</AlertDescription>
            </div>
          </Alert>
          <Alert variant="primary">
            <CheckCircle size={20} />
            <div>
              <AlertTitle>Payment received</AlertTitle>
              <AlertDescription>Rent for Unit 4B has been recorded.</AlertDescription>
            </div>
          </Alert>
          <Alert variant="accent">
            <ExclamationCircle size={20} />
            <div>
              <AlertTitle>Lease expiring</AlertTitle>
              <AlertDescription>3 leases expire within 30 days.</AlertDescription>
            </div>
          </Alert>
        </div>
      </Section>

      {/* Navigation bits */}
      <Section title="Navigation">
        <div className="space-y-6">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Portfolio", href: "/portfolio" },
              { label: "Nakasero Heights" },
            ]}
          />
          <Pagination page={page} pageCount={10} onPageChange={setPage} />
        </div>
      </Section>

      {/* Timeline + empty state */}
      <Section title="Timeline & empty state">
        <div className="grid gap-8 lg:grid-cols-2">
          <Timeline>
            <TimelineItem title="Lease signed" time="Jun 2">
              12-month agreement for Unit 4B.
            </TimelineItem>
            <TimelineItem title="Move-in inspection" time="Jun 5">
              Completed with no issues.
            </TimelineItem>
            <TimelineItem title="First rent received" time="Jun 30" />
          </Timeline>
          <EmptyState
            icon={<FileLines size={24} />}
            title="No documents yet"
            description="Uploaded leases and statements will appear here."
            action={<Button size="sm">Upload document</Button>}
          />
        </div>
      </Section>

      {/* Skeletons */}
      <Section title="Skeleton loaders">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <SkeletonText lines={3} />
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <SkeletonCard />
          <SkeletonChart />
          <SkeletonTable rows={4} cols={4} />
        </div>
      </Section>
    </TooltipProvider>
  );
}
