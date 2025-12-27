import { useNavigate } from "react-router-dom";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

interface GlobalMessageBadgeProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  className?: string;
}

export const GlobalMessageBadge = ({
  variant = "outline",
  size = "sm",
  showText = true,
  className,
}: GlobalMessageBadgeProps) => {
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => navigate("/messages")}
      className={`relative ${className || ""}`}
    >
      <MessageSquare className="w-4 h-4" />
      {showText && <span className="ml-2">Meldinger</span>}
      {unreadCount > 0 && (
        <Badge className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center text-xs px-1">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
};
