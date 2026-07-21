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
  Alert,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { useUpdateVolume } from './useCatalogApi';

interface EditVolumeModalProps {
  project: string;
  namespace: string;
  name: string;
  currentDescription: string;
  currentProperties: Record<string, string>;
  currentLocation: string;
  onClose: () => void;
}

const INTERNAL_KEYS = ['_catalog_managed', 'asset_type', 'comment', 'description', 'connection-ref', 'location', 'namespace', 'volume_type'];

const EditVolumeModal: React.FC<EditVolumeModalProps> = ({
  project,
  namespace,
  name,
  currentDescription,
  currentProperties,
  currentLocation,
  onClose,
}) => {
  const [description, setDescription] = React.useState(currentDescription || '');
  const [storageLocation, setStorageLocation] = React.useState(currentLocation || '');
  const [tags, setTags] = React.useState<Array<{ key: string; value: string }>>(
    Object.entries(currentProperties)
      .filter(([k]) => !INTERNAL_KEYS.includes(k))
      .map(([key, value]) => ({ key, value })),
  );
  const [tagKey, setTagKey] = React.useState('');
  const [tagValue, setTagValue] = React.useState('');
  const [error, setError] = React.useState('');

  const updateMutation = useUpdateVolume();

  const handleAddTag = () => {
    if (tagKey.trim()) {
      setTags([...tags, { key: tagKey.trim(), value: tagValue.trim() }]);
      setTagKey('');
      setTagValue('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');

    const properties: Record<string, string> = {};
    tags.forEach((t) => { properties[t.key] = t.value; });

    try {
      await updateMutation.mutateAsync({
        project,
        namespace,
        name,
        comment: description !== currentDescription ? description : undefined,
        properties: Object.keys(properties).length > 0 ? properties : undefined,
        storageLocation: storageLocation !== currentLocation ? storageLocation : undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update volume');
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      aria-label="Edit volume"
    >
      <ModalHeader title={`Edit volume: ${name}`} />
      <ModalBody>
        {error && (
          <Alert variant="danger" isInline title={error} style={{ marginBottom: '16px' }} />
        )}
        <Form>
          <FormGroup label="Description" fieldId="edit-volume-description">
            <TextInput
              id="edit-volume-description"
              value={description}
              onChange={(_event, val) => setDescription(val)}
            />
          </FormGroup>

          <FormGroup label="Storage location" fieldId="edit-volume-location">
            <TextInput
              id="edit-volume-location"
              value={storageLocation}
              onChange={(_event, val) => setStorageLocation(val)}
              placeholder="s3://bucket/path/"
            />
          </FormGroup>

          <FormGroup label="Properties" fieldId="edit-volume-tags">
            <Flex>
              <FlexItem>
                <TextInput
                  id="edit-vol-tag-key"
                  value={tagKey}
                  onChange={(_event, val) => setTagKey(val)}
                  placeholder="Key"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <TextInput
                  id="edit-vol-tag-value"
                  value={tagValue}
                  onChange={(_event, val) => setTagValue(val)}
                  placeholder="Value"
                  style={{ width: '160px' }}
                />
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </FlexItem>
            </Flex>
            {tags.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {tags.map((tag, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{tag.key}:</span>
                    <TextInput
                      value={tag.value}
                      onChange={(_event, val) => {
                        const updated = [...tags];
                        updated[i] = { ...updated[i], value: val };
                        setTags(updated);
                      }}
                      style={{ width: '200px' }}
                    />
                    <Button variant="plain" onClick={() => handleRemoveTag(i)} style={{ padding: '2px' }}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={updateMutation.isPending}
          isDisabled={updateMutation.isPending}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditVolumeModal;
