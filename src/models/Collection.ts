import { v4 as uuidv4 } from 'uuid';

export interface CollectionJSON {
  id: string;
  name: string;
  createdAt: string;
  workspaceId?: string;
  order?: number;
}

export class Collection {
  public readonly id: string;
  public readonly name: string;
  public readonly createdAt: Date;
  public readonly workspaceId?: string;
  public order: number;

  constructor(name: string, workspaceId?: string, order?: number) {
    this.id = uuidv4();
    this.name = name;
    this.createdAt = new Date();
    this.workspaceId = workspaceId;
    this.order = order ?? 0;
  }

  public toJSON(): CollectionJSON {
    return {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      workspaceId: this.workspaceId,
      order: this.order,
    };
  }

  public static fromJSON(json: CollectionJSON): Collection {
    const collection = new Collection(json.name, json.workspaceId, json.order);
    // Override the generated id and createdAt with the stored values
    Object.defineProperty(collection, 'id', {
      value: json.id,
      writable: false,
    });
    Object.defineProperty(collection, 'createdAt', {
      value: new Date(json.createdAt),
      writable: false,
    });
    return collection;
  }
}
