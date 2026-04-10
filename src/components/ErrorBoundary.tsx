import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error.message, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>ulbo tripped over something</Text>
                    <Text style={styles.message}>
                        Something unexpected happened. Your journal entries are safe — just tap below to try again.
                    </Text>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => this.setState({ hasError: false })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 28,
        color: BLACK,
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontFamily: 'Carlito',
        fontSize: 16,
        color: '#444444',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    button: {
        backgroundColor: YELLOW,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: BLACK,
    },
    buttonText: {
        fontFamily: 'Carlito-Bold',
        fontSize: 16,
        color: BLACK,
    },
});
