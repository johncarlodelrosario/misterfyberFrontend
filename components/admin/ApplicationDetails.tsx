// components/admin/ApplicationDetails.tsx
"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Hash,
  Wifi,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  Layers,
} from "lucide-react";
import { format } from "date-fns";

interface Application {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  buildingId:
    | string
    | { _id: string; buildingName: string; streetAddress: string };
  tower: string;
  floor: string;
  unitNumber: string;
  planId:
    | string
    | {
        _id: string;
        name: string;
        price: number;
        speed: { download: number; upload: number };
      };
  status: "pending" | "approved" | "rejected";
  idType: string;
  idNumber: string;
  macAddress?: string;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationDetailsProps {
  application: Application;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onStartBilling: (id: string) => Promise<void>;
  onClose: () => void;
}

export function ApplicationDetails({
  application,
  onApprove,
  onReject,
  onStartBilling,
  onClose,
}: ApplicationDetailsProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const getBuildingName = (
    building: string | { _id: string; buildingName: string },
  ) => {
    if (typeof building === "string") return building;
    return building?.buildingName || "N/A";
  };

  const getBuildingAddress = (
    building:
      | string
      | { _id: string; buildingName: string; streetAddress: string },
  ) => {
    if (typeof building === "string") return "N/A";
    return building?.streetAddress || "N/A";
  };

  const getPlanName = (
    plan: string | { _id: string; name: string; price: number },
  ) => {
    if (typeof plan === "string") return plan;
    return plan?.name || "N/A";
  };

  const getPlanPrice = (
    plan: string | { _id: string; name: string; price: number },
  ) => {
    if (typeof plan === "string") return 0;
    return plan?.price || 0;
  };

  const getPlanSpeed = (
    plan:
      | string
      | {
          _id: string;
          name: string;
          price: number;
          speed: { download: number; upload: number };
        },
  ) => {
    if (typeof plan === "string") return { download: 0, upload: 0 };
    return plan?.speed || { download: 0, upload: 0 };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await onApprove(application._id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await onReject(application._id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBilling = async () => {
    setActionLoading(true);
    try {
      await onStartBilling(application._id);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM d, yyyy h:mm a");
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {application.status === "approved" && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {application.status === "pending" && (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            {application.status === "rejected" && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">Status:</span>
          </div>
          {getStatusBadge(application.status)}
        </div>
        <div className="text-sm text-muted-foreground">
          ID: {application._id.slice(-8).toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">
                {application.firstName} {application.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {application.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {application.phoneNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID Type:</span>
              <span className="font-medium">{application.idType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID Number:</span>
              <span className="font-medium">{application.idNumber}</span>
            </div>
            {application.macAddress && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">MAC Address:</span>
                <span className="font-medium font-mono text-xs">
                  {application.macAddress}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Building:</span>
              <span className="font-medium flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {getBuildingName(application.buildingId)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span className="font-medium">
                {getBuildingAddress(application.buildingId)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tower:</span>
              <span className="font-medium">{application.tower || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Floor:</span>
              <span className="font-medium">{application.floor || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit:</span>
              <span className="font-medium">
                {application.unitNumber || "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Plan Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-medium">
                {getPlanName(application.planId)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {getPlanPrice(application.planId).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Speed:</span>
              <span className="font-medium">
                {getPlanSpeed(application.planId).download} Mbps /{" "}
                {getPlanSpeed(application.planId).upload} Mbps
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(application.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated:</span>
              <span className="font-medium">
                {formatDate(application.updatedAt)}
              </span>
            </div>
            {application.notes && (
              <div className="mt-2">
                <span className="text-muted-foreground">Notes:</span>
                <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                  {application.notes}
                </p>
              </div>
            )}
            {application.adminNotes && (
              <div className="mt-2">
                <span className="text-muted-foreground">Admin Notes:</span>
                <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                  {application.adminNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {application.status === "pending" && (
          <>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-green-500 hover:bg-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </>
        )}
        {application.status === "approved" && (
          <Button onClick={handleStartBilling} disabled={actionLoading}>
            <DollarSign className="h-4 w-4 mr-2" />
            Start Billing
          </Button>
        )}
      </div>
    </div>
  );
}
