import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="center-stage">
          <section className="panel error-panel">
            <span className="eyebrow">App Error</span>
            <h1>Something stopped the arena from loading.</h1>
            <p>{this.state.error.message}</p>
            <button className="primary" onClick={() => window.location.reload()}>Reload</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
