#!/bin/bash

# 1Password Service Account Setup for OOS
# Sets up reusable service account authentication across all OOS installations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration files
OP_CONFIG_DIR="$HOME/.config/op"
OP_CONFIG_FILE="$OP_CONFIG_DIR/config"
SERVICE_ACCOUNT_FILE="$OP_CONFIG_DIR/service_account.txt"

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_op_cli() {
    if ! command -v op &> /dev/null; then
        error "1Password CLI not found. Please install it first:"
        echo "  curl -sS https://downloads.1password.com/linux/keys/1password.asc | sudo gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg"
        echo "  echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/$(dpkg --print-architecture) stable main' | sudo tee /etc/apt/sources.list.d/1password.list"
        echo "  sudo apt update && sudo apt install 1password-cli"
        exit 1
    fi
    success "1Password CLI found"
}

setup_service_account() {
    info "Setting up 1Password service account for OOS..."

    # Create config directory
    mkdir -p "$OP_CONFIG_DIR"

    # Check if service account already configured
    if [[ -f "$SERVICE_ACCOUNT_FILE" ]]; then
        local existing_token=$(cat "$SERVICE_ACCOUNT_FILE")
        if export OP_SERVICE_ACCOUNT_TOKEN="$existing_token" && op whoami &> /dev/null; then
            success "Service account already configured and working"
            return 0
        else
            warning "Existing service account token is not working, setting up new one"
        fi
    fi

    echo
    info "To set up a service account:"
    echo "1. Go to https://start.1password.com/integrations/service-account"
    echo "2. Create a new service account with appropriate permissions"
    echo "3. Copy the service account token"
    echo

    # Prompt for service account token
    local service_token
    read -p "Enter service account token: " service_token

    if [[ -z "$service_token" ]]; then
        error "No service account token provided"
        exit 1
    fi

    # Test the token
    export OP_SERVICE_ACCOUNT_TOKEN="$service_token"

    if op whoami &> /dev/null; then
        success "Service account authentication successful!"

        # Save token for future use
        echo "$service_token" > "$SERVICE_ACCOUNT_FILE"
        chmod 600 "$SERVICE_ACCOUNT_FILE"

        # Get account info
        local account_info=$(op account get --format=json 2>/dev/null || echo "{}")
        local account_email=$(echo "$account_info" | jq -r '.email // "unknown"')

        success "Service account configured for: $account_email"
        info "Token saved to: $SERVICE_ACCOUNT_FILE"
        info "This will be used automatically across all OOS installations"

    else
        error "Service account token failed to authenticate"
        error "Please check:"
        echo "  - Token is copied correctly"
        echo "  - Service account has proper permissions"
        echo "  - Token hasn't expired"
        exit 1
    fi
}

setup_environment() {
    info "Setting up environment variables..."

    # Add to shell profile
    local profile_file="$HOME/.bashrc"
    if [[ -f "$HOME/.zshrc" ]]; then
        profile_file="$HOME/.zshrc"
    fi

    local env_line='export OP_SERVICE_ACCOUNT_TOKEN="$(cat ~/.config/op/service_account.txt 2>/dev/null || echo "")"'

    if ! grep -q "OP_SERVICE_ACCOUNT_TOKEN" "$profile_file" 2>/dev/null; then
        echo "" >> "$profile_file"
        echo "# OOS 1Password Service Account" >> "$profile_file"
        echo "$env_line" >> "$profile_file"
        success "Added service account token to $profile_file"
    else
        info "Service account token already configured in shell profile"
    fi
}

test_setup() {
    info "Testing 1Password service account setup..."

    # Load token from file
    if [[ -f "$SERVICE_ACCOUNT_FILE" ]]; then
        export OP_SERVICE_ACCOUNT_TOKEN="$(cat "$SERVICE_ACCOUNT_FILE")"
    else
        error "Service account file not found"
        return 1
    fi

    # Test authentication
    if op whoami &> /dev/null; then
        success "Service account authentication working!"

        # List available vaults
        local vault_count=$(op vault list --format=json | jq length 2>/dev/null || echo "0")
        success "Found $vault_count vault(s) accessible"

        return 0
    else
        error "Service account authentication failed"
        return 1
    fi
}

show_usage_info() {
    echo
    info "=== 1Password Service Account Setup Complete ==="
    echo
    echo "Your service account is now configured for use with OOS."
    echo
    echo "Usage:"
    echo "  • The service account token is stored in: $SERVICE_ACCOUNT_FILE"
    echo "  • Environment variable is automatically set in your shell profile"
    echo "  • All OOS installations will automatically use this service account"
    echo "  • No manual authentication required for weeks/months"
    echo
    echo "To verify it's working:"
    echo "  op whoami"
    echo "  op vault list"
    echo
    echo "To manage the service account:"
    echo "  • View token: cat $SERVICE_ACCOUNT_FILE"
    echo "  • Test setup: $0 --test"
    echo "  • Reset setup: $0 --reset"
    echo
}

main() {
    local action="setup"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --test)
                action="test"
                shift
                ;;
            --reset)
                action="reset"
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [--test|--reset|--help]"
                echo "  --test   Test existing service account setup"
                echo "  --reset  Reset and reconfigure service account"
                echo "  --help   Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    case $action in
        setup)
            check_op_cli
            setup_service_account
            setup_environment
            show_usage_info
            ;;
        test)
            test_setup
            ;;
        reset)
            warning "Resetting 1Password service account configuration..."
            rm -f "$SERVICE_ACCOUNT_FILE" "$OP_CONFIG_FILE"
            info "Configuration cleared. Run $0 to set up again."
            ;;
    esac
}

# Run main function
main "$@"