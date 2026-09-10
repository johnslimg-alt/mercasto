"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) =>
<DialogPrimitive.Overlay data-source-location="src/components/ui/dialog.jsx:18:2" data-dynamic-content="true"
ref={ref}
className={cn(
  "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  className
)}
{...props} />
);
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) =>
<DialogPortal data-source-location="src/components/ui/dialog.jsx:29:2" data-dynamic-content="true">
    <DialogOverlay data-source-location="src/components/ui/dialog.jsx:30:4" data-dynamic-content="false" />
    <DialogPrimitive.Content data-source-location="src/components/ui/dialog.jsx:31:4" data-dynamic-content="true"
  ref={ref}
  className={cn(
    "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
    className
  )}
  {...props}>
      {children}
      <DialogPrimitive.Close data-source-location="src/components/ui/dialog.jsx:39:6" data-dynamic-content="false"
    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X data-source-location="src/components/ui/dialog.jsx:41:8" data-dynamic-content="false" className="h-4 w-4" />
        <span data-source-location="src/components/ui/dialog.jsx:42:8" data-dynamic-content="false" className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}) =>
<div data-source-location="src/components/ui/dialog.jsx:53:2" data-dynamic-content="true"
className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
{...props} />;

DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}) =>
<div data-source-location="src/components/ui/dialog.jsx:63:2" data-dynamic-content="true"
className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
{...props} />;

DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) =>
<DialogPrimitive.Title data-source-location="src/components/ui/dialog.jsx:70:2" data-dynamic-content="true"
ref={ref}
className={cn("text-lg font-semibold leading-none tracking-tight", className)}
{...props} />
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(({ className, ...props }, ref) =>
<DialogPrimitive.Description data-source-location="src/components/ui/dialog.jsx:78:2" data-dynamic-content="true"
ref={ref}
className={cn("text-sm text-muted-foreground", className)}
{...props} />
);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription };