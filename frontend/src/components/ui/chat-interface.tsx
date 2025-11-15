'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2 } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LoaderConfig {
  enabled: boolean;
  delay?: number;
  duration?: number;
}

interface Link {
  text: string;
}

interface Message {
  id: number;
  sender: 'left' | 'right';
  type: 'text' | 'image' | 'text-with-links';
  content: string;
  maxWidth?: string;
  loader?: LoaderConfig;
  links?: Link[];
}

interface Person {
  name: string;
  avatar: string;
}

interface ChatStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  showBorder: boolean;
  nameColor?: string;
}

interface LinkBubbleStyle {
  backgroundColor: string;
  textColor: string;
  iconColor: string;
  borderColor: string;
}

interface UiConfig {
  containerWidth?: number;
  containerHeight?: number;
  backgroundColor?: string;
  autoRestart?: boolean;
  restartDelay?: number;
  loader?: {
    dotColor?: string;
  };
  linkBubbles?: LinkBubbleStyle;
  leftChat?: ChatStyle;
  rightChat?: ChatStyle;
}

interface ChatConfig {
  leftPerson: Person;
  rightPerson: Person;
  messages: Message[];
}

interface ChatComponentProps {
  config: ChatConfig;
  uiConfig?: UiConfig;
}

interface MessageLoaderProps {
  dotColor?: string;
}

interface LinkBadgeProps {
  link: Link;
  linkStyle: LinkBubbleStyle;
}

interface MessageBubbleProps {
  message: Message;
  isLeft: boolean;
  uiConfig: Required<UiConfig>;
  onContentReady?: () => void;
  isLoading: boolean;
  isVisible: boolean;
}

interface MessageWrapperProps {
  message: Message;
  config: ChatConfig;
  uiConfig: Required<UiConfig>;
  previousMessageComplete: boolean;
  onMessageComplete?: (messageId: number) => void;
  previousMessage: Message | null;
  nextMessage: Message | null;
  onVisibilityChange?: (messageId: number) => void;
  isNextVisible: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex color to rgba with specified alpha
 */
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Animated loading indicator with bouncing dots
 * @param {string} dotColor - Color of the loading dots
 */
const MessageLoader = React.memo<MessageLoaderProps>(({ dotColor = '#9ca3af' }) => {
  const dotAnimation = {
    y: [0, -6, 0]
  };

  const dotTransition = (delay = 0) => ({
    duration: 0.6,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay
  });

  return (
    <motion.div
      className="flex items-center gap-1 px-3 py-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
          animate={dotAnimation}
          transition={dotTransition(delay)}
        />
      ))}
    </motion.div>
  );
});

MessageLoader.displayName = 'MessageLoader';

/**
 * Link badge component for displaying clickable links (non-functional, just visual)
 */
const LinkBadge = React.memo<LinkBadgeProps>(({ link, linkStyle }) => (
  <div
    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs border tracking-wider"
    style={{
      backgroundColor: linkStyle.backgroundColor,
      color: linkStyle.textColor,
      borderColor: linkStyle.borderColor
    }}
  >
    <Link2 size={12} color={linkStyle.iconColor} />
    <span>{link.text}</span>
  </div>
));

LinkBadge.displayName = 'LinkBadge';

// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================

/**
 * Message bubble that displays different content types (text, image, text-with-links)
 * Handles smooth transition from loader to content
 */
const MessageBubble = React.memo<MessageBubbleProps>(({ message, isLeft, uiConfig, onContentReady, isLoading, isVisible }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const chatStyle = isLeft ? uiConfig.leftChat! : uiConfig.rightChat!;

  // Notify parent when text content is ready
  useEffect(() => {
    if (isVisible && (message.type === 'text' || message.type === 'text-with-links')) {
      onContentReady?.();
    }
  }, [isVisible, message.type, onContentReady]);

  // Handle image load completion
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    onContentReady?.();
  }, [onContentReady]);

  // Memoize bubble styling with glass morphism effect
  const bubbleStyle = useMemo(() => ({
    backgroundColor: chatStyle.backgroundColor,
    color: chatStyle.textColor,
    borderColor: chatStyle.borderColor,
    borderWidth: chatStyle.showBorder ? '1px' : '0',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    boxShadow: isLeft 
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
      : '0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
  }), [chatStyle.backgroundColor, chatStyle.textColor, chatStyle.borderColor, chatStyle.showBorder, isLeft]);

  // 带柔和小尖尖的聊天气泡样式（类似 iMessage/WhatsApp 风格）
  const roundedClass = isLeft ? "rounded-2xl rounded-tl-sm" : "rounded-2xl rounded-tr-sm";
  
  // 添加渐变遮罩层以增强视觉效果
  const gradientOverlay = useMemo(() => {
    if (isLeft) {
      return 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)';
    } else {
      return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 197, 253, 0.1) 100%)';
    }
  }, [isLeft]);

  // Always use minimal padding for images, adjust content spacing internally
  const paddingClass = message.type === 'image' ? 'p-1' : 'p-4';

  // 柔顺的小尖尖样式（使用 SVG 路径实现圆润的尾巴效果）
  const tailStyle = useMemo(() => {
    const tailWidth = 8;
    const tailHeight = 12;
    if (isLeft) {
      return {
        position: 'absolute' as const,
        left: `-${tailWidth}px`,
        top: '14px',
        width: `${tailWidth}px`,
        height: `${tailHeight}px`,
        backgroundColor: 'transparent',
        ...(chatStyle.showBorder ? {} : {})
      };
    } else {
      return {
        position: 'absolute' as const,
        right: `-${tailWidth}px`,
        top: '14px',
        width: `${tailWidth}px`,
        height: `${tailHeight}px`,
        backgroundColor: 'transparent',
        ...(chatStyle.showBorder ? {} : {})
      };
    }
  }, [isLeft, chatStyle.showBorder]);

  // SVG 路径用于创建柔顺的小尖尖（更圆润的样式）
  const tailPath = useMemo(() => {
    if (isLeft) {
      // 左侧：小尖尖指向左，使用更平滑的曲线
      return (
        <svg
          width="10"
          height="16"
          viewBox="0 0 10 16"
          style={{ position: 'absolute', left: '-10px', top: '12px', zIndex: 1 }}
        >
          <path
            d="M 0 2 Q 0 0, 2 0 Q 4 2, 4 6 Q 4 10, 2 12 Q 0 14, 0 16 L 10 8 Z"
            fill={chatStyle.backgroundColor}
            stroke={chatStyle.showBorder ? chatStyle.borderColor : 'none'}
            strokeWidth={chatStyle.showBorder ? '0.5' : '0'}
          />
        </svg>
      );
    } else {
      // 右侧：小尖尖指向右，使用更平滑的曲线
      return (
        <svg
          width="10"
          height="16"
          viewBox="0 0 10 16"
          style={{ position: 'absolute', right: '-10px', top: '12px', zIndex: 1 }}
        >
          <path
            d="M 10 2 Q 10 0, 8 0 Q 6 2, 6 6 Q 6 10, 8 12 Q 10 14, 10 16 L 0 8 Z"
            fill={chatStyle.backgroundColor}
            stroke={chatStyle.showBorder ? chatStyle.borderColor : 'none'}
            strokeWidth={chatStyle.showBorder ? '0.5' : '0'}
          />
        </svg>
      );
    }
  }, [isLeft, chatStyle.backgroundColor, chatStyle.borderColor, chatStyle.showBorder]);

  return (
    <div
      className={`${roundedClass} ${paddingClass} w-full relative transition-all duration-200 hover:scale-[1.01]`}
      style={{
        ...bubbleStyle,
        borderStyle: chatStyle.showBorder ? 'solid' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 渐变遮罩层 */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: gradientOverlay,
          opacity: 0.6
        }}
      />
      {/* 柔顺的小尖尖（SVG 路径） */}
      {tailPath}
      <AnimatePresence mode="wait">
        {/* Show loader while message is loading */}
        {isLoading && !isVisible ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={message.type === 'image' ? 'flex items-center justify-center p-3' : 'flex items-center justify-center'}
          >
            <MessageLoader dotColor={uiConfig.loader?.dotColor} />
          </motion.div>
        ) : isVisible ? (
          /* Show actual message content */
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            {/* Text message */}
            {message.type === 'text' && (
              <p 
                className="text-sm leading-relaxed font-medium" 
                style={{ 
                  color: chatStyle.textColor,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              >
                {message.content}
              </p>
            )}

            {/* Image message */}
            {message.type === 'image' && (
              <div className="relative min-h-32">
                {!imageLoaded && (
                  <div className="w-full h-32 flex items-center justify-center">
                    <MessageLoader dotColor={uiConfig.loader?.dotColor} />
                  </div>
                )}
                <img
                  src={message.content}
                  alt="Chat image"
                  className={`rounded max-h-full max-w-48 h-auto object-cover ${!imageLoaded ? 'hidden' : ''}`}
                  onLoad={handleImageLoad}
                />
              </div>
            )}

            {/* Text with link badges */}
            {message.type === 'text-with-links' && (
              <div>
                <p 
                  className="text-sm leading-relaxed mb-3 font-medium" 
                  style={{ 
                    color: chatStyle.textColor,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {message.content}
                </p>
                <div className="flex flex-wrap gap-1">
                  {message.links?.map((link, index) => (
                    <LinkBadge key={index} link={link} linkStyle={uiConfig.linkBubbles!} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================================================
// MESSAGE WRAPPER COMPONENT
// ============================================================================

/**
 * Wrapper for individual messages that handles:
 * - Sequential loading/display logic
 * - Avatar positioning and animation
 * - Username display for message groups
 * - Completion tracking
 */
const MessageWrapper = React.memo<MessageWrapperProps>(({
  message,
  config,
  uiConfig,
  previousMessageComplete,
  onMessageComplete,
  previousMessage,
  nextMessage,
  onVisibilityChange,
  isNextVisible
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messageCompleted, setMessageCompleted] = useState(false);

  const isLeft = message.sender === 'left';
  const person = isLeft ? config.leftPerson : config.rightPerson;
  const chatStyle = isLeft ? uiConfig.leftChat! : uiConfig.rightChat!;

  // Message grouping logic
  const isContinuation = previousMessage?.sender === message.sender;
  const nextMessageSameSender = nextMessage?.sender === message.sender;
  const shouldShowAvatar = !nextMessageSameSender || !isNextVisible;

  // Sequential message loading
  useEffect(() => {
    if (!previousMessageComplete) return;

    const { loader } = message;
    const loaderDelay = 500;
    const totalDelay = loaderDelay + (loader?.duration || 1000);

    if (loader?.enabled) {
      const loaderTimeout = setTimeout(() => setIsLoading(true), loaderDelay);
      const messageTimeout = setTimeout(() => {
        setIsLoading(false);
        setIsVisible(true);
        onVisibilityChange?.(message.id);
      }, totalDelay);

      return () => {
        clearTimeout(loaderTimeout);
        clearTimeout(messageTimeout);
      };
    } else {
      const messageTimeout = setTimeout(() => {
        setIsVisible(true);
        onVisibilityChange?.(message.id);
      }, 0);

      return () => clearTimeout(messageTimeout);
    }
  }, [message, previousMessageComplete, onVisibilityChange]);

  // Notify parent when content is fully loaded
  const handleContentReady = useCallback(() => {
    if (!messageCompleted) {
      setMessageCompleted(true);
      setTimeout(() => onMessageComplete?.(message.id), 350); // Match animation duration
    }
  }, [messageCompleted, onMessageComplete, message.id]);

  // Memoize layout classes
  // Agent A (left): 头像在左，消息在右，整体靠左
  // Agent B (right): 头像在右，消息在左，整体靠右
  const messageClass = useMemo(() =>
    isLeft ? "flex items-end gap-2 justify-start" : "flex items-end gap-2 justify-end",
    [isLeft]
  );

  if (!isLoading && !isVisible) return null;

  return (
    <div className={`${messageClass} w-full`}>
      {/* Message content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col"
        style={{ 
          alignItems: isLeft ? 'flex-start' : 'flex-end',
          maxWidth: '70%',
          marginLeft: isLeft ? '0' : 'auto',
          marginRight: isLeft ? 'auto' : '0'
        }}
      >
        {/* Username with Avatar (only for first message in group) */}
        {!isContinuation && (
          <motion.div
            className={`flex items-center gap-2 mb-1 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.25 }}
          >
            {shouldShowAvatar && (
              <motion.img
                src={person.avatar}
                alt={person.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0 shadow-md"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
            <span
              className="text-xs leading-relaxed font-medium tracking-wide"
              style={{ 
                color: chatStyle.nameColor || '#582F0E',
                filter: isLeft ? 'brightness(1.8)' : 'brightness(1.2)',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              {person.name}
            </span>
          </motion.div>
        )}

        <MessageBubble
          message={message}
          isLeft={isLeft}
          uiConfig={uiConfig}
          onContentReady={handleContentReady}
          isLoading={isLoading}
          isVisible={isVisible}
        />
      </motion.div>
    </div>
  );
});

MessageWrapper.displayName = 'MessageWrapper';

// ============================================================================
// MAIN CHAT COMPONENT
// ============================================================================

/**
 * Main chat interface component with auto-scrolling, message sequencing,
 * and auto-restart functionality
 */
const ChatComponent: React.FC<ChatComponentProps> = ({ config, uiConfig = {} }) => {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [completedMessages, setCompletedMessages] = useState<number[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [key, setKey] = useState(0); // Key for forcing component remount
  const prevConfigRef = useRef<ChatConfig | null>(null); // Track previous config

  // Default configuration
  const defaultUiConfig: Required<UiConfig> = {
    containerWidth: 400,
    containerHeight: 500,
    backgroundColor: '#ffffff',
    autoRestart: false,
    restartDelay: 3000,
    loader: { dotColor: '#9ca3af' },
    linkBubbles: {
      backgroundColor: '#f3f4f6',
      textColor: '#1f2937',
      iconColor: '#374151',
      borderColor: '#e5e7eb'
    },
    leftChat: {
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      borderColor: '#d1d1d1',
      showBorder: true,
      nameColor: '#1a1a1a'
    },
    rightChat: {
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      borderColor: '#d1d1d1',
      showBorder: true,
      nameColor: '#1a1a1a'
    }
  };

  const ui: Required<UiConfig> = { ...defaultUiConfig, ...uiConfig } as Required<UiConfig>;

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMessageComplete = useCallback((messageId: number) => {
    setCompletedMessages(prev => {
      const newCompleted = [...prev, messageId];

      // Auto-restart when all messages are complete
      if (newCompleted.length === config.messages.length && ui.autoRestart) {
        setTimeout(() => {
          setCompletedMessages([]);
          setVisibleMessages([]);
          setKey(prevKey => prevKey + 1); // Force remount
        }, ui.restartDelay);
      }

      return newCompleted;
    });
  }, [config.messages.length, ui.autoRestart, ui.restartDelay]);

  const handleVisibilityChange = useCallback((messageId: number) => {
    setVisibleMessages(prev =>
      prev.includes(messageId) ? prev : [...prev, messageId]
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
  }, []);

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Scroll to top when component first mounts or config changes
  useEffect(() => {
    // Check if this is a new conversation (config changed)
    const isNewConversation = prevConfigRef.current === null || 
      prevConfigRef.current.messages.length !== config.messages.length ||
      prevConfigRef.current.messages[0]?.id !== config.messages[0]?.id;
    
    if (isNewConversation) {
      // Use a small delay to ensure the container is rendered
      const timer = setTimeout(() => {
        scrollToTop();
      }, 100);
      prevConfigRef.current = config;
      return () => clearTimeout(timer);
    }
    prevConfigRef.current = config;
  }, [config, scrollToTop]);

  // Auto-scroll on new messages
  useEffect(() => {
    const observer = new MutationObserver(scrollToBottom);

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true
      });
    }

    return () => observer.disconnect();
  }, [key, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [config.messages, completedMessages, scrollToBottom]);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  // Memoize gradient background to avoid recalculating on every render
  const gradientBackground = useMemo(() => {
    return `linear-gradient(to bottom, ${hexToRgba(ui.backgroundColor, 1)} 0%, ${hexToRgba(ui.backgroundColor, 0.95)} 20%, ${hexToRgba(ui.backgroundColor, 0.8)} 40%, ${hexToRgba(ui.backgroundColor, 0.4)} 70%, ${hexToRgba(ui.backgroundColor, 0)} 100%)`;
  }, [ui.backgroundColor]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div
      key={key}
      className={`rounded-lg relative ${ui.containerWidth === undefined ? 'w-full' : 'mx-auto'} ${ui.containerHeight === undefined ? 'h-full' : ''}`}
      style={{
        ...(ui.containerWidth !== undefined && { width: `${ui.containerWidth}px` }),
        ...(ui.containerHeight !== undefined && { height: `${ui.containerHeight}px` }),
        backgroundColor: ui.backgroundColor === 'transparent' ? 'transparent' : ui.backgroundColor
      }}
    >
      {/* Top gradient fade overlay */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-10 rounded-t-lg"
        style={{ background: gradientBackground }}
      />

      {/* Scrollable messages container */}
      <div
        ref={containerRef}
        className="p-8 overflow-y-scroll h-full custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
      >
        {/* Custom scrollbar styles */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 2px;
            transition: background 0.2s;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-track {
            background: #1e293b;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}</style>

        {/* Messages list */}
        <div className="min-h-full flex flex-col justify-end">
          {config.messages.map((message, index) => {
            const previousMessageComplete = index === 0 || completedMessages.includes(config.messages[index - 1].id);
            const previousMessage = index > 0 ? config.messages[index - 1] : null;
            const nextMessage = index < config.messages.length - 1 ? config.messages[index + 1] : null;
            const isNextVisible = nextMessage ? visibleMessages.includes(nextMessage.id) : false;
            const isContinuation = previousMessage?.sender === message.sender;

            // Tight spacing for same-sender messages, larger spacing for different senders
            const spacingClass = index === 0 ? "" : (isContinuation ? "mt-1.5" : "mt-8");

            return (
              <div key={message.id} className={spacingClass}>
                <MessageWrapper
                  message={message}
                  config={config}
                  uiConfig={ui}
                  previousMessageComplete={previousMessageComplete}
                  onMessageComplete={handleMessageComplete}
                  onVisibilityChange={handleVisibilityChange}
                  previousMessage={previousMessage}
                  nextMessage={nextMessage}
                  isNextVisible={isNextVisible}
                />
              </div>
            );
          })}
          {/* Scroll anchor with spacing */}
          <div ref={messagesEndRef} className="h-8" />
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
export type { ChatComponentProps, ChatConfig, UiConfig, Message, Person, ChatStyle, LinkBubbleStyle };

