"use client";
import { providers } from "@llmgateway/models";
import { useSearchParams } from "next/navigation";
import {
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

import { useDashboardState } from "@/lib/dashboard-state";
import { useApi } from "@/lib/fetch-client";

import type { ActivitT } from "@/types/activity";

interface CostBreakdownChartProps {
	initialData?: ActivitT;
}

export function CostBreakdownChart({ initialData }: CostBreakdownChartProps) {
	const searchParams = useSearchParams();
	const { selectedProject } = useDashboardState();

	// Get days from URL parameter
	const daysParam = searchParams.get("days");
	const days = daysParam === "30" ? 30 : 7;

	const api = useApi();
	const { data, isLoading, error } = api.useQuery(
		"get",
		"/activity",
		{
			params: {
				query: {
					days: String(days),
					...(selectedProject?.id ? { projectId: selectedProject.id } : {}),
				},
			},
		},
		{
			enabled: !!selectedProject?.id,
			initialData: daysParam ? initialData : undefined,
		},
	);

	if (!selectedProject) {
		return (
			<div className="flex h-[350px] items-center justify-center">
				<p className="text-muted-foreground">
					Please select a project to view cost breakdown
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex h-[350px] items-center justify-center">
				Loading cost data...
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex h-[350px] items-center justify-center">
				<p className="text-destructive">Error loading activity data</p>
			</div>
		);
	}

	if (!data || data.activity.length === 0) {
		return (
			<div className="flex h-[350px] items-center justify-center">
				<p className="text-muted-foreground">
					No cost data available
					{selectedProject && (
						<span className="block mt-1 text-sm">
							Project: {selectedProject.name}
						</span>
					)}
				</p>
			</div>
		);
	}

	const providerCosts = new Map<string, number>();

	data.activity.forEach((day) => {
		day.modelBreakdown.forEach((model) => {
			const currentCost = providerCosts.get(model.provider) || 0;
			providerCosts.set(model.provider, currentCost + model.cost);
		});
	});

	const chartData = Array.from(providerCosts.entries())
		.map(([provider, cost]) => ({
			name: provider,
			value: cost,
			color: getProviderColor(provider),
		}))
		.sort((a, b) => b.value - a.value);

	function getProviderColor(providerName: string) {
		// Find the provider in the providers array by name (case-insensitive)
		const provider = providers.find(
			(p) => p.name.toLowerCase() === providerName.toLowerCase(),
		);

		// Return the color if found, otherwise use a default color
		return provider?.color || "#94a3b8"; // Default color for unknown providers
	}

	const totalCost = chartData.reduce((sum, item) => sum + item.value, 0);

	return (
		<div>
			<ResponsiveContainer width="100%" height={350}>
				<PieChart>
					<Pie
						data={chartData}
						cx="50%"
						cy="50%"
						innerRadius={60}
						outerRadius={100}
						paddingAngle={2}
						dataKey="value"
						label={({ name, percent }) =>
							`${name} ${(percent * 100).toFixed(0)}%`
						}
						labelLine={false}
					>
						{chartData.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={entry.color} />
						))}
					</Pie>
					<Tooltip
						formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
					/>
					<Legend />
				</PieChart>
			</ResponsiveContainer>
			<div className="text-center mt-4">
				<p className="text-sm text-muted-foreground">
					Total Cost:{" "}
					<span className="font-medium">${totalCost.toFixed(4)}</span>
					{selectedProject && (
						<span className="block mt-1">Project: {selectedProject.name}</span>
					)}
				</p>
			</div>
		</div>
	);
}
