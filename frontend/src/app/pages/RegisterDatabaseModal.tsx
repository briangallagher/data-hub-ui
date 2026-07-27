import React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  TextInput,
  FormSelect,
  FormSelectOption,
  Alert,
} from '@patternfly/react-core';
import { useCreateDatabase, DataConnection } from './useCatalogApi';

interface RegisterDatabaseModalProps {
  project: string;
  namespace: string;
  connections: DataConnection[];
  onClose: () => void;
}

const DB_TYPE_OPTIONS = [
  'postgresql',
  'mysql',
  'snowflake',
  'mssql',
  'oracle',
  'mongodb',
  'redis',
  'cockroachdb',
  'mariadb',
];

const RegisterDatabaseModal: React.FC<RegisterDatabaseModalProps> = ({
  project,
  namespace,
  connections,
  onClose,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dbType, setDbType] = React.useState('postgresql');
  const [host, setHost] = React.useState('');
  const [database, setDatabase] = React.useState('');
  const [schemas, setSchemas] = React.useState('');
  const [connectionRef, setConnectionRef] = React.useState('');
  const [error, setError] = React.useState('');

  const createMutation = useCreateDatabase();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!host.trim()) {
      setError('Host is required');
      return;
    }
    if (!database.trim()) {
      setError('Database name is required');
      return;
    }
    setError('');

    try {
      await createMutation.mutateAsync({
        project,
        collection: namespace,
        name: name.trim(),
        db_type: dbType,
        host: host.trim(),
        database: database.trim(),
        schemas: schemas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        connection_ref: connectionRef || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register database';
      setError(msg);
    }
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen onClose={onClose} aria-label="Register database">
      <ModalHeader title="Register database" />
      <ModalBody>
        <Form>
          {error && (
            <Alert variant="danger" isInline title={error} />
          )}
          <FormGroup label="Name" isRequired fieldId="db-name">
            <TextInput
              id="db-name"
              value={name}
              onChange={(_e, val) => setName(val)}
              placeholder="e.g. prod-analytics"
              isRequired
            />
          </FormGroup>
          <FormGroup label="Database type" isRequired fieldId="db-type">
            <FormSelect id="db-type" value={dbType} onChange={(_e, val) => setDbType(val)}>
              {DB_TYPE_OPTIONS.map((t) => (
                <FormSelectOption key={t} value={t} label={t} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Host:port" isRequired fieldId="db-host">
            <TextInput
              id="db-host"
              value={host}
              onChange={(_e, val) => setHost(val)}
              placeholder="e.g. postgres.prod.svc:5432"
              isRequired
            />
          </FormGroup>
          <FormGroup label="Database name" isRequired fieldId="db-database">
            <TextInput
              id="db-database"
              value={database}
              onChange={(_e, val) => setDatabase(val)}
              placeholder="e.g. analytics"
              isRequired
            />
          </FormGroup>
          <FormGroup label="Schemas" fieldId="db-schemas">
            <TextInput
              id="db-schemas"
              value={schemas}
              onChange={(_e, val) => setSchemas(val)}
              placeholder="e.g. public, reporting (comma-separated)"
            />
          </FormGroup>
          <FormGroup label="Data Connection" fieldId="db-connection">
            <FormSelect
              id="db-connection"
              value={connectionRef}
              onChange={(_e, val) => setConnectionRef(val)}
            >
              <FormSelectOption value="" label="(none)" />
              {connections.map((c) => (
                <FormSelectOption key={c.name} value={c.name} label={c.displayName || c.name} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Description" fieldId="db-description">
            <TextInput
              id="db-description"
              value={description}
              onChange={(_e, val) => setDescription(val)}
              placeholder="What data is in this database?"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          isDisabled={!name.trim() || !host.trim() || !database.trim() || createMutation.isPending}
          isLoading={createMutation.isPending}
          onClick={handleSubmit}
        >
          Register
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RegisterDatabaseModal;
