'use strict';

const GObject = imports.gi.GObject;

/// An object to easily manage signals.
var Connections = class Connections {
    constructor() {
        this.buffer = [];
    }

    /// Process the given actor and id.
    ///
    /// This makes sure that the signal is disconnected when the actor is
    /// destroyed, and that the signal can be managed through other Connections
    /// methods.
    process_connection(actor, id) {
        let infos = {
            actor: actor,
            id: id
        };

        // remove the signal when the actor is destroyed
        if (
            actor.connect &&
            (
                !(actor instanceof GObject.Object) ||
                GObject.signal_lookup('destroy', actor)
            )
        ) {
            let destroy_id = actor.connect('destroy', () => {
                actor.disconnect(id);
                actor.disconnect(destroy_id);

                let index = this.buffer.indexOf(infos);
                if (index >= 0) {
                    this.buffer.splice(index, 1);
                }
            });
        }

        this.buffer.push(infos);
    }

    /// Adds a connection.
    ///
    /// Takes as arguments:
    /// - an actor, which fires the signal
    /// - a signal (string), which is watched for
    /// - a callback, which is called when the signal is fired
    connect(actor, signal, handler) {
        let id = actor.connect(signal, handler);

        this.process_connection(actor, id);

        return id;
    }

    /// Disconnects the connection with id.
    disconnect(id) {
        for (const [index, connection] of this.buffer.entries()) {
            try {
                if (connection.id == id) {
                    // disconnect
                    connection.actor.disconnect(connection.id);
                    // remove from buffer
                    this.buffer.splice(index, 1);
                    break;
                }
            } catch (e) {
                this._log(`error removing connection: ${e};`);
            }
        }
    }

    /// Disconnects every connection found for an actor.
    disconnect_all_for(actor) {
        // get every connection stored for the actor
        let actor_connections = this.buffer.filter(
            infos => infos.actor == actor
        );

        // remove each of them
        actor_connections.forEach((connection) => {
            // disconnect
            try {
                connection.actor.disconnect(connection.id);
            } catch (e) {
                this._log(`error removing connection: ${e}; continuing`);
            }

            // remove from buffer
            let index = this.buffer.indexOf(connection);
            this.buffer.splice(index, 1);
        });
    }

    /// Disconnect every connection for each actor.
    disconnect_all() {
        this.buffer.forEach((connection) => {
            // disconnect
            try {
                connection.actor.disconnect(connection.id);
            } catch (e) {
                this._log(`error removing connection: ${e}; continuing`);
            }
        });

        // reset buffer
        this.buffer = [];
    }

    _log(str) {
        // no need to check if DEBUG here as this._log is only used on error
        log(`[Blur my Shell] ${str}`);
    }
};