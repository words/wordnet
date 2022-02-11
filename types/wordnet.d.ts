type SynsetType = 'noun' | 'verb' | 'adjective' | 'adjective satellite' | 'adverb';
type ShortSynsetType = 'n'|'v'|'a'|'s'|'r';

/**
 * !    Antonym
 * @    Hypernym
 * @i    Instance Hypernym
 * ~    Hyponym
 * ~i    Instance Hyponym
 * #m    Member holonym
 * #s    Substance holonym
 * #p    Part holonym
 * %m    Member meronym
 * %s    Substance meronym
 * %p    Part meronym
 * =    Attribute
 * +    Derivationally related form
 * ;c    Domain of synset - TOPIC
 * -c    Member of this domain - TOPIC
 * ;r    Domain of synset - REGION
 * -r    Member of this domain - REGION
 * ;u    Domain of synset - USAGE
 * -u    Member of this domain - USAGE
 */
type NounPointerSymbol = '!'|'@'|'@i'|'~'|'~i'|'#m'|'#s'|'#p'|'%m'|'%s'|'%p'|'='|'+'|';c'|'-c'|';r'|'-r'|';u'|'-u';

/**
 * !    Antonym 
 * @    Hypernym 
 *  ~    Hyponym 
 * *    Entailment 
 * >    Cause 
 * ^    Also see 
 * $    Verb Group 
 * +    Derivationally related form         
 * ;c    Domain of synset - TOPIC 
 * ;r    Domain of synset - REGION 
 * ;u    Domain of synset - USAGE  
 */
type VerbPointerSymbol = '!'|'@'|'~'|'*'|'>'|'^'|'$'|'+'|';c'|';r'|';u';

/**
 * !    Antonym 
 * &    Similar to 
 * <    Participle of verb 
 * \    Pertainym (pertains to noun) 
 * =    Attribute 
 * ^    Also see 
 * ;c    Domain of synset - TOPIC 
 * ;r    Domain of synset - REGION 
 * ;u    Domain of synset - USAGE
*/
type AdjectivePointerSymbol = '!'|'&'|'<'|'\\'|'='|'^'|';c'|';r'|';u';

/**
 * !    Antonym 
 * \    Derived from adjective 
 * ;c    Domain of synset - TOPIC 
 * ;r    Domain of synset - REGION 
 * ;u    Domain of synset - USAGE
*/
type AdverbPointerSymbol = '!'|'/'|';r'|';r'|';u';

type PointerSymbol = NounPointerSymbol | VerbPointerSymbol | AdverbPointerSymbol | AdjectivePointerSymbol;

type Definition = {
  meta: {
    synsetOffset: number;
    lexFilenum: number;
    synsetType: SynsetType;
    wordCount: number;
    words: {word: string; lexId:number}[];
    pointerCount: number;
    pointers: {
      pointerSymbol: PointerSymbol;
      synsetOffset: number;
      /** Part of speech */
      pos: ShortSynsetType;
      sourceTargetHex: string;
      data: Definition;
    }[];
  };
  glossary: string;
};

declare module 'wordnet' {

  /**
   * Parses the database files and loads them into memory.
   *
   * @param {String} databaseDir Optional database directory path.
   * @return {Promise} Empty promise object.
   */
  export function init(databaseDir: string): Promise<undefined>;

  /**
   * Lists all the words.
   *
   * @return {Array<String>} List of all words.
   */
  export function list(): string[];

  /**
   * Looks up a word
   *
   * @param {String} word Word to look up.
   * @param {boolean} skipPointers Whether to skip inclusion of pointer data.
   * @return {Promise<Array<Definition>>} Resolves with definitions for the given word.
   */
  export function lookup(word: string, skipPointers?: boolean): Promise<Definition[]>;
}